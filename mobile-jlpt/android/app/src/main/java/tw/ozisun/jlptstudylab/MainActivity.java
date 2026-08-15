package tw.ozisun.jlptstudylab;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends Activity {
    private WebView webView;
    private AdView adView;
    private FrameLayout adContainer;

    private static final String APP_URL = "https://jlpt-study-lab.vercel.app/?app=android";
    // Google official Android anchored adaptive banner test ID.
    // Replace with the production Android Banner Ad Unit ID before publishing.
    private static final String BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/9214589741";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

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

        new Thread(() -> MobileAds.initialize(this, status -> runOnUiThread(this::loadBanner))).start();

        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);
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
        settings.setUserAgentString(settings.getUserAgentString() + " JLPTStudyLabAndroid/1.1");

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
