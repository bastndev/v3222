import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

val signingPropertiesFile = rootProject.file("keystore.properties")
val signingProperties = Properties()
if (signingPropertiesFile.exists()) {
    FileInputStream(signingPropertiesFile).use(signingProperties::load)
}
val signingKeys = listOf("storeFile", "storePassword", "keyAlias", "keyPassword")
val hasReleaseSigning = signingPropertiesFile.exists() && signingKeys.all(signingProperties::containsKey)

android {
    namespace = "{{packageId}}"
    compileSdk = 35

    defaultConfig {
        applicationId = "{{packageId}}"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        val sparklingDevServerHost =
            (project.findProperty("sparklingDevServerHost") as String?) ?: "127.0.0.1"
        val sparklingDevServerPort =
            (project.findProperty("sparklingDevServerPort") as String?) ?: "5969"
        buildConfigField("String", "SPARKLING_DEV_SERVER_HOST", "\"$sparklingDevServerHost\"")
        buildConfigField("int", "SPARKLING_DEV_SERVER_PORT", sparklingDevServerPort)
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = rootProject.file(signingProperties.getProperty("storeFile"))
                storePassword = signingProperties.getProperty("storePassword")
                keyAlias = signingProperties.getProperty("keyAlias")
                keyPassword = signingProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    packaging {
        jniLibs {
            useLegacyPackaging = false
        }
    }

    val useNativeAssets =
        System.getenv("SPARKLING_USE_NATIVE_ASSETS")?.equals("true", ignoreCase = true) ?: false
    sourceSets {
        getByName("main").apply {
            assets.setSrcDirs(
                if (useNativeAssets) listOf("src/main/assets") else listOf("../../dist"),
            )
        }
        getByName("debug").manifest.srcFile("src/debug/AndroidManifest.xml")
        getByName("release").java.srcDirs("src/release/java")
        getByName("debug").java.srcDirs("src/debug/java")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)

    implementation("com.tiktok.sparkling:sparkling:{{sparklingVersion}}") {
        exclude(group = "org.lynxsdk.lynx", module = "lynx-service-devtool")
        exclude(group = "org.lynxsdk.lynx", module = "lynx-devtool")
        exclude(group = "org.lynxsdk.lynx", module = "debug-router")
        exclude(group = "org.lynxsdk.lynx", module = "base-devtool")
    }
    implementation("com.tiktok.sparkling:sparkling-method:{{sparklingVersion}}")
    implementation("com.squareup.okhttp3:okhttp:4.9.0")

    implementation(libs.fresco)
    implementation(libs.fresco.animated.gif)
    implementation(libs.fresco.animated.webp)
    implementation(libs.fresco.webp.support)
    implementation(libs.fresco.animated.base)

    debugImplementation("com.tiktok.sparkling:sparkling-debug-tool:{{sparklingVersion}}")

    // BEGIN SPARKLING AUTOLINK
    implementation(project(":sparkling-navigation"))
    // END SPARKLING AUTOLINK
}
