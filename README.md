# Unity Bear Controller - WebGL

React Native WebView용 Unity Bear Controller WebGL 버전입니다.

## 🚀 GitHub Pages 배포

이 프로젝트는 GitHub Pages로 배포되어 React Native WebView에서 사용할 수 있습니다.

### 배포 URL
```
https://[username].github.io/unity-webgl-bear/
```

## 📁 프로젝트 구조

```
unity-webgl-bear/
├── index.html              # 메인 HTML 파일
├── Build/                  # Unity WebGL 빌드 파일들
│   ├── unity-webgl-bear.data
│   ├── unity-webgl-bear.framework.js
│   └── unity-webgl-bear.wasm
├── StreamingAssets/        # Unity 스트리밍 에셋
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions 자동 배포
```

## 🔧 Unity 설정

### Unity WebGL 빌드 설정
1. **File > Build Settings > WebGL**
2. **Player Settings > Publishing Settings**:
   - Compression Format: Gzip
   - Exception Support: None
   - Data Caching: true

### BearSwitcher 스크립트 (Unity C#)
```csharp
using System.Runtime.InteropServices;
using UnityEngine;

public class BearSwitcher : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SendMessageToReactNative(string message);

    // React Native에서 호출할 메서드
    public void OnReactNativeMessage(string jsonData)
    {
        var data = JsonUtility.FromJson<CommandData>(jsonData);
        
        switch (data.data)
        {
            case "1":
                SetBearMode(1);
                break;
            case "2":
                SetBearMode(2);
                break;
            case "3":
                SetBearMode(3);
                break;
            case "RESET":
                ResetBear();
                break;
        }
    }

    private void SetBearMode(int mode)
    {
        // Bear 애니메이션/상태 변경 로직
        
        // React Native에 완료 알림
        SendToReactNative("showBearStudy", $"Bear 모드 {mode} 활성화!", mode);
    }

    private void ResetBear()
    {
        // Bear 초기 상태로 리셋
        
        SendToReactNative("bear_reset", "Bear 리셋 완료", 0);
    }

    private void SendToReactNative(string action, string message, int bearMode)
    {
        var data = new {
            action = action,
            message = message,
            bearMode = bearMode,
            vibrate = true,
            vibrationPattern = new int[] { 0, 200, 100, 200 },
            timestamp = System.DateTimeOffset.Now.ToUnixTimeMilliseconds()
        };
        
        string json = JsonUtility.ToJson(data);
        
        #if UNITY_WEBGL && !UNITY_EDITOR
        SendMessageToReactNative(json);
        #endif
    }
}

[System.Serializable]
public class CommandData
{
    public string gameObject;
    public string method;
    public string data;
    public long timestamp;
}
```

## 📱 React Native WebView 연동

### WebView 컴포넌트
```jsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function UnityWebViewBear() {
    const webViewRef = useRef(null);
    const [isUnityLoaded, setIsUnityLoaded] = useState(false);

    // Unity에 명령 전송
    const sendToBear = (command) => {
        if (!isUnityLoaded) return;
        
        const jsCode = `
            if (window.sendCommandToUnity) {
                window.sendCommandToUnity('BearSwitcher', 'OnReactNativeMessage', '${command}');
            }
        `;
        
        webViewRef.current?.injectJavaScript(jsCode);
    };

    // Unity에서 메시지 받기
    const handleUnityMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Unity Bear 메시지:', data);
            
            if (data.type === 'UNITY_LOADED') {
                setIsUnityLoaded(true);
            }
            
            if (data.action === 'showBearStudy' && data.vibrate) {
                // 진동 처리
                console.log('Bear 진동:', data.vibrationPattern);
            }
            
        } catch (error) {
            console.log('Unity 메시지 파싱 오류:', error);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ uri: 'https://[username].github.io/unity-webgl-bear/' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                onMessage={handleUnityMessage}
                style={styles.webview}
            />
            
            {/* Bear 컨트롤 버튼들 */}
            <View style={styles.controlButtons}>
                {[1, 2, 3].map((num) => (
                    <TouchableOpacity
                        key={num}
                        onPress={() => sendToBear(num.toString())}
                        style={styles.button}
                        disabled={!isUnityLoaded}
                    >
                        <Text style={styles.buttonText}>{num}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    webview: {
        flex: 1,
    },
    controlButtons: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: 'rgba(34, 34, 34, 0.8)',
        borderRadius: 30,
        paddingVertical: 16,
        paddingHorizontal: 28,
        marginHorizontal: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
```

## 🚀 배포 방법

### 1. GitHub Repository 생성
```bash
git init
git add .
git commit -m "Initial Unity WebGL Bear setup"
git remote add origin https://github.com/[username]/unity-webgl-bear.git
git push -u origin main
```

### 2. GitHub Pages 활성화
1. Repository Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: main / (root)
4. Save

### 3. Unity 빌드 파일 추가
- Unity에서 WebGL로 빌드
- Build 폴더 내용을 이 프로젝트의 `Build/` 폴더에 복사
- Commit & Push

## 🔄 장점

✅ **간단한 배포**: GitHub Pages로 즉시 배포  
✅ **크로스 플랫폼**: iOS/Android 동일한 코드  
✅ **쉬운 업데이트**: Unity 빌드만 교체하면 즉시 반영  
✅ **디버깅 용이**: 브라우저 개발자 도구 사용 가능  
✅ **네이티브 연동**: React Native에서 카메라 완전 제어  

## 📝 사용법

1. Unity 프로젝트에서 WebGL 빌드
2. 빌드 파일들을 `Build/` 폴더에 복사
3. GitHub에 push
4. React Native에서 WebView로 로드
5. 카메라는 React Native에서 별도 제어