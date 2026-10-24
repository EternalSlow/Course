package com.neur0devil.course;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ErrorLogPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
