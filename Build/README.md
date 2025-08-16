# Unity WebGL Build Files

이 폴더에는 Unity에서 WebGL로 빌드한 파일들이 들어갑니다.

## 필요한 파일들

Unity WebGL 빌드 시 생성되는 파일들을 이 폴더에 복사하세요:

```
Build/
├── unity-webgl-bear.data
├── unity-webgl-bear.framework.js
├── unity-webgl-bear.wasm
└── unity-webgl-bear.loader.js (Unity 2021 이상)
```

## Unity 빌드 설정

### Build Settings
1. **Platform**: WebGL
2. **Target Platform**: WebGL 2.0
3. **Compression Format**: Gzip (GitHub Pages 호환)

### Player Settings
- **Company Name**: SSAFY
- **Product Name**: Bear Controller  
- **Data Caching**: Enabled
- **Exception Support**: None (최적화)

### WebGL Memory Size
- **Memory Size**: 256MB (기본값)
- **Enable Exceptions**: None

## BearSwitcher.cs 스크립트

Unity 프로젝트에 다음 스크립트를 추가하세요:

```csharp
using System.Runtime.InteropServices;
using UnityEngine;

public class BearSwitcher : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SendMessageToReactNative(string message);

    public void OnReactNativeMessage(string jsonData)
    {
        Debug.Log("RN에서 받은 메시지: " + jsonData);
        
        try {
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
                case "0":
                    ResetBear();
                    break;
                default:
                    Debug.Log("알 수 없는 명령: " + data.data);
                    break;
            }
        } catch (System.Exception e) {
            Debug.LogError("메시지 파싱 오류: " + e.Message);
        }
    }

    private void SetBearMode(int mode)
    {
        Debug.Log("Bear 모드 " + mode + " 설정");
        
        // TODO: Bear 애니메이션/상태 변경 로직 구현
        // 예: animator.SetInteger("BearMode", mode);
        
        // React Native에 완료 알림
        SendToReactNative("showBearStudy", $"Bear 모드 {mode} 활성화!", mode);
    }

    private void ResetBear()
    {
        Debug.Log("Bear 리셋");
        
        // TODO: Bear 초기 상태로 리셋
        // 예: animator.SetInteger("BearMode", 0);
        
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
        Debug.Log("RN으로 전송: " + json);
        
        #if UNITY_WEBGL && !UNITY_EDITOR
        SendMessageToReactNative(json);
        #else
        Debug.Log("에디터에서는 RN 통신 시뮬레이션");
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

## 빌드 후 작업

1. Unity에서 WebGL 빌드 완료
2. 빌드 폴더의 모든 파일을 이 `Build/` 폴더에 복사
3. Git add, commit, push
4. GitHub Pages에서 자동 배포됨

## 테스트

브라우저에서 직접 테스트:
```
https://[username].github.io/unity-webgl-bear/
```

콘솔에서 수동 테스트:
```javascript
// Bear 모드 1 실행
window.sendCommandToUnity('BearSwitcher', 'OnReactNativeMessage', '1');

// Bear 리셋
window.sendCommandToUnity('BearSwitcher', 'OnReactNativeMessage', 'RESET');
```