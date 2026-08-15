package tw.ozisun.jlptstudylab;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

public class MainActivity extends Activity {
    private WebView webView;
    private AdView adView;
    private FrameLayout adContainer;
    private Button privacyButton;
    private ConsentInformation consentInformation;
    private boolean adsInitialized = false;

    private static final String APP_URL = "https://jlpt-study-lab.vercel.app/?app=android";
    private static final String SHARE_URL = "https://jlpt-study-lab.vercel.app";
    private static final String BANNER_AD_UNIT_ID = "ca-app-pub-3086163657339958/3415519835";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        root.addView(buildNativeToolbar());

        webView = new WebView(this);
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        webView.setLayoutParams(webParams);
        root.addView(webView);

        adContainer = new FrameLayout(this);
        adContainer.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(adContainer);

        setContentView(root);
        configureWebView();
        configurePrivacyAndAds();

        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);
    }

    private View buildNativeToolbar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12), dp(6), dp(8), dp(6));
        bar.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText("JLPT Study Lab");
        title.setTextColor(Color.rgb(24, 34, 55));
        title.setTextSize(17);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(44), 1f));

        Button shareButton = new Button(this);
        shareButton.setText("分享");
        shareButton.setAllCaps(false);
        shareButton.setOnClickListener(v -> shareApp());
        bar.addView(shareButton, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));

        privacyButton = new Button(this);
        privacyButton.setText("隱私");
        privacyButton.setAllCaps(false);
        privacyButton.setVisibility(View.GONE);
        privacyButton.setOnClickListener(v -> showPrivacyOptions());
        bar.addView(privacyButton, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));
        return bar;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void shareApp() {
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_SUBJECT, "JLPT Study Lab");
        share.putExtra(Intent.EXTRA_TEXT, "JLPT Study Lab\n" + SHARE_URL);
        startActivity(Intent.createChooser(share, "分享 JLPT Study Lab"));
    }

    private void configurePrivacyAndAds() {
        consentInformation = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(
                this,
                params,
                () -> {
                    updatePrivacyButton();
                    maybeInitializeAds();
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            this,
                            formError -> {
                                updatePrivacyButton();
                                maybeInitializeAds();
                            });
                },
                requestConsentError -> {
                    updatePrivacyButton();
                    maybeInitializeAds();
                });
    }

    private void updatePrivacyButton() {
        runOnUiThread(() -> {
            boolean required = consentInformation != null &&
                    consentInformation.getPrivacyOptionsRequirementStatus() ==
                            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
            privacyButton.setVisibility(required ? View.VISIBLE : View.GONE);
        });
    }

    private void showPrivacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(this, formError -> {
            updatePrivacyButton();
            maybeInitializeAds();
        });
    }

    private void maybeInitializeAds() {
        if (adsInitialized || consentInformation == null || !consentInformation.canRequestAds()) return;
        adsInitialized = true;
        MobileAds.initialize(this, status -> runOnUiThread(this::loadBanner));
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " JLPTStudyLabAndroid/1.3");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals("jlpt-study-lab.vercel.app") || host.endsWith("raw.githack.com"))) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {}
                return true;
            }
        });
    }

    private void loadBanner() {
        if (isFinishing() || isDestroyed()) return;
        if (adView != null) adView.destroy();

        adView = new AdView(this);
        adView.setAdUnitId(BANNER_AD_UNIT_ID);

        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int adWidth = Math.max(320, (int) (metrics.widthPixels / metrics.density));
        AdSize adSize = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, adWidth);
        adView.setAdSize(adSize);

        adContainer.removeAllViews();
        adContainer.addView(adView);
        adView.loadAd(new AdRequest.Builder().build());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (adView != null) adView.pause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adView != null) adView.resume();
    }

    @Override
    protected void onDestroy() {
        if (adView != null) {
            adView.destroy();
            adView = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
