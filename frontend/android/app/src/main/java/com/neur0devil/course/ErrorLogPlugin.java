package com.neur0devil.course;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "ErrorLog")
public class ErrorLogPlugin extends Plugin {
    private static final Pattern SAFE_FILENAME = Pattern.compile("[A-Za-z0-9._-]+\\.json");
    private static final int MAX_LOG_LENGTH = 1_000_000;

    @PluginMethod
    public void saveAndOpenFolder(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content");
        if (filename == null || !SAFE_FILENAME.matcher(filename).matches()
                || content == null || content.length() > MAX_LOG_LENGTH) {
            call.reject("Invalid diagnostic log data.");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            intent.putExtra(
                    DocumentsContract.EXTRA_INITIAL_URI,
                    DocumentsContract.buildDocumentUri(
                            "com.android.externalstorage.documents",
                            "primary:Download"
                    )
            );
            startActivityForResult(call, intent, "legacySaveResult");
            return;
        }

        Uri fileUri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
            values.put(
                    MediaStore.MediaColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS + "/Byte"
            );
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            fileUri = getContext().getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    values
            );
            if (fileUri == null) {
                throw new IOException("Android could not create the diagnostic file.");
            }

            try (OutputStream output = getContext().getContentResolver().openOutputStream(fileUri)) {
                if (output == null) {
                    throw new IOException("Android could not open the diagnostic file.");
                }
                output.write(content.getBytes(StandardCharsets.UTF_8));
            }

            ContentValues ready = new ContentValues();
            ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (getContext().getContentResolver().update(fileUri, ready, null, null) != 1) {
                throw new IOException("Android could not finish saving the diagnostic file.");
            }
        } catch (Exception error) {
            if (fileUri != null) {
                try {
                    getContext().getContentResolver().delete(fileUri, null, null);
                } catch (Exception cleanupError) {
                    error.addSuppressed(cleanupError);
                }
            }
            call.reject("Could not save the diagnostic file.", error);
            return;
        }

        openFolderPicker(
                call,
                DocumentsContract.buildDocumentUri(
                        "com.android.externalstorage.documents",
                        "primary:Download/Byte"
                )
        );
    }

    @ActivityCallback
    private void legacySaveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        if (result == null || result.getResultCode() != android.app.Activity.RESULT_OK
                || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            response.put("folderOpened", false);
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }

        Uri fileUri = result.getData().getData();
        String content = call.getString("content");
        try {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(fileUri)) {
                if (output == null) {
                    throw new IOException("Android could not open the diagnostic file.");
                }
                output.write(content.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception error) {
            call.reject("Could not save the diagnostic file.", error);
            return;
        }

        try {
            String documentId = DocumentsContract.getDocumentId(fileUri);
            int parentSeparator = documentId.lastIndexOf('/');
            if (parentSeparator < 0) {
                throw new IOException("Android did not return the diagnostic file folder.");
            }
            Uri parentUri = DocumentsContract.buildDocumentUri(
                    fileUri.getAuthority(),
                    documentId.substring(0, parentSeparator)
            );
            openFolderPicker(call, parentUri);
        } catch (Exception error) {
            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("folderOpened", false);
            response.put("folderError", error.getMessage());
            call.resolve(response);
        }
    }

    private void openFolderPicker(PluginCall call, Uri initialFolderUri) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialFolderUri);
        try {
            startActivityForResult(call, intent, "folderPickerResult");
        } catch (Exception error) {
            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("folderOpened", false);
            response.put("folderError", error.getMessage());
            call.resolve(response);
        }
    }

    @ActivityCallback
    private void folderPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        JSObject response = new JSObject();
        response.put("saved", true);
        response.put(
                "folderOpened",
                result != null && result.getResultCode() == android.app.Activity.RESULT_OK
        );
        call.resolve(response);
    }
}
