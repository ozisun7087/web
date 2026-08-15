package com.toeflstudy.lab;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

public class MainActivity extends Activity {
    private static final String HOME = "https://toefl-ibt-2026-study-lab.vercel.app";
    private static final String HOME_HOST = "toefl-ibt-2026-study-lab.vercel.app";
    private static final String BANNER_AD_UNIT_ID = "ca-app-pub-3086163657339958/2344508561";
    private static final int REQ_AUDIO = 701;

    private WebView webView;
    private FrameLayout adContainer;
    private TextView privacyButton;
    private AdView adView;
    private PermissionRequest pendingWebPermission;
    private ConsentInformation consentInformation;
    private boolean mobileAdsStarted = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildLayout();
        configureWebView(savedInstanceState);
        configureConsentAndAds();
    }

    private void buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        privacyButton = new TextView(this);
        privacyButton.setText("隱私權選項");
        privacyButton.setTextColor(Color.rgb(49, 87, 213));
        privacyButton.setTextSize(12f);
        privacyButton.setGravity(Gravity.CENTER);
        privacyButton.setPadding(8, 7, 8, 7);
        privacyButton.setVisibility(View.GONE);
        privacyButton.setOnClickListener(v -> UserMessagingPlatform.showPrivacyOptionsForm(
                this,
                formError -> updatePrivacyButton()));
        root.addView(privacyButton, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT));

        adContainer = new FrameLayout(this);
        adContainer.setBackgroundColor(Color.WHITE);
        adContainer.setForegroundGravity(Gravity.CENTER);
        root.addView(adContainer, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT));

        setContentView(root);
    }

    private void configureWebView(Bundle savedInstanceState) {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " TOEFLStudyLabAndroid/1.0.57");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                if ("https".equals(scheme) && HOME_HOST.equals(host)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Native apps use AdMob. Hide the website's AdSense placeholders/units
                // so the same screen never shows both web and native ad inventory.
                String js = "(function(){var id='toefl-native-app-ad-hide';"
                        + "if(!document.getElementById(id)){var s=document.createElement('style');"
                        + "s.id=id;s.textContent='.toefl-ad-wrap{display:none!important}';"
                        + "document.head.appendChild(s);}})();";
                view.evaluateJavascript(js, null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimeType);
                req.addRequestHeader("User-Agent", userAgent);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
                Toast.makeText(this, "已開始下載", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(HOME);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void handleWebPermission(PermissionRequest request) {
        Uri origin = request.getOrigin();
        String host = origin.getHost() == null ? "" : origin.getHost().toLowerCase();
        boolean allowedOrigin = "https".equalsIgnoreCase(origin.getScheme()) && HOME_HOST.equals(host);
        boolean asksOnlyAudio = request.getResources().length > 0;
        for (String r : request.getResources()) {
            if (!PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                asksOnlyAudio = false;
                break;
            }
        }
        if (!allowedOrigin || !asksOnlyAudio) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingWebPermission = request;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_AUDIO);
        }
    }

    private void configureConsentAndAds() {
        consentInformation = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(
                this,
                params,
                () -> {
                    updatePrivacyButton();
                    maybeStartAds();
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            this,
                            formError -> {
                                updatePrivacyButton();
                                maybeStartAds();
                            });
                },
                requestConsentError -> {
                    updatePrivacyButton();
                    maybeStartAds();
                });
    }

    private void updatePrivacyButton() {
        runOnUiThread(() -> {
            if (consentInformation == null) return;
            privacyButton.setVisibility(
                    consentInformation.getPrivacyOptionsRequirementStatus()
                            == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
                            ? View.VISIBLE : View.GONE);
        });
    }

    private void maybeStartAds() {
        if (consentInformation == null || !consentInformation.canRequestAds() || mobileAdsStarted) return;
        mobileAdsStarted = true;
        MobileAds.initialize(this, initializationStatus -> runOnUiThread(this::loadBanner));
    }

    private void loadBanner() {
        if (isFinishing() || isDestroyed()) return;
        if (adView != null) {
            adView.destroy();
            adContainer.removeAllViews();
        }
        adView = new AdView(this);
        adView.setAdUnitId(BANNER_AD_UNIT_ID);
        int widthPx = getResources().getDisplayMetrics().widthPixels;
        float density = getResources().getDisplayMetrics().density;
        int widthDp = Math.max(320, (int) (widthPx / density));
        adView.setAdSize(AdSize.getLargeAnchoredAdaptiveBannerAdSize(this, widthDp));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER);
        adContainer.removeAllViews();
        adContainer.addView(adView, lp);
        adView.loadAd(new AdRequest.Builder().build());
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_AUDIO && pendingWebPermission != null) {
            PermissionRequest p = pendingWebPermission;
            pendingWebPermission = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                p.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                p.deny();
                Toast.makeText(this, "Speaking 錄音需要麥克風權限", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (adView != null) adView.pause();
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        if (adView != null) adView.resume();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (adView != null) adView.destroy();
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
