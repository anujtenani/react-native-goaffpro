# react-native-goaffpro

React native module to implement goaffpro affiliate marketing system in react native apps

## Installation

```sh
npm install react-native-goaffpro @react-native-async-storage/async-storage
npx pod-install -y
```

## Usage

```js
import { init, trackPageView, trackConversion } from "react-native-goaffpro";

// ...
// use your public token from Settings -> Advanced Settings tab -> Access Tokens section
// to initialize the SDK
init("x-goaffpro-public-token")

trackPageView() // optional method to call on screen change. To increment the page view counter for the affiliates


// after the customer places the order, call the following to track the conversion
trackConversion({
  number:'#1001',
  total:500
})
// for complete order schema of trackConversion method, see
// https://github.com/anujtenani/goaffpro/wiki/Custom-Integration-advanced-guide#extended-order-schema-for-conversion-tracking

```
# Android setup
To enable deep links in your android app, you can follow the guide below
https://developer.android.com/training/app-links/deep-linking#adding-filters

In your AndroidManifest.xml file, for you main activity, set the intent filter to open the app
```xml
<activity
    android:name="com.example.android.MainActivity"
    android:label="@string/title_gizmos" >
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="http" />
    <data android:scheme="https" />
    <data android:host="mystore.com" />
  </intent-filter>
</activity>
```
Note: You will also need to host a assetlinks.json file on your website to verify the identity
https://developer.android.com/training/app-links/verify-site-associations#web-assoc

# iOS setup

You can follow the guides below
https://reactnative.dev/docs/linking#built-in-url-schemes
https://developer.apple.com/library/archive/documentation/General/Conceptual/AppSearch/UniversalLinks.html

