package com.youtubetv.app;

import android.os.Bundle;
import android.util.Log;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.gms.tasks.Task;
import android.app.UiModeManager;
import android.content.res.Configuration;

public class MainActivity extends BridgeActivity {
    private AppUpdateManager appUpdateManager;
    private static final String TAG = "InAppUpdate";

    private final ActivityResultLauncher<androidx.activity.result.IntentSenderRequest> updateLauncher =
        registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                if (result.getResultCode() != RESULT_OK) {
                    Log.e(TAG, "Update flow failed! Result code: " + result.getResultCode());
                    // If the update is canceled or fails, you can request to start the update again.
                }
            }
        );

    private boolean isAndroidTV() {
        try {
            UiModeManager uiModeManager = (UiModeManager) getSystemService(UI_MODE_SERVICE);
            return uiModeManager != null && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
        } catch (Exception e) {
            Log.e(TAG, "Error checking if device is Android TV", e);
            return false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (isAndroidTV()) {
            Log.i(TAG, "Running on Android TV - bypassing In-App Update flow.");
            return;
        }

        try {
            appUpdateManager = AppUpdateManagerFactory.create(this);
            checkForUpdates();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize AppUpdateManager", e);
        }
    }

    private void checkForUpdates() {
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();

        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                
                try {
                    appUpdateManager.startUpdateFlowForResult(
                        appUpdateInfo,
                        updateLauncher,
                        AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
                    );
                } catch (Exception e) {
                    Log.e(TAG, "Error starting update flow", e);
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        
        if (isAndroidTV() || appUpdateManager == null) {
            return;
        }

        try {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.updateAvailability() == 
                    UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    // Resume an immediate update that is already in progress
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            updateLauncher,
                            AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
                        );
                    } catch (Exception e) {
                        Log.e(TAG, "Error resuming update flow", e);
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error checking update in onResume", e);
        }
    }
}
