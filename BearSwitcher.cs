using System.Runtime.InteropServices;
using UnityEngine;

public class BearSwitcher : MonoBehaviour
{
    [Header("Bear 컨트롤러 설정")]
    public GameObject bearObject;
    public Material[] bearMaterials; // 0: 기본, 1: 모드1, 2: 모드2, 3: 모드3
    
    [Header("애니메이션 설정")]
    public float rotationSpeed = 90f;
    public float scaleAnimation = 1.2f;
    
    private Renderer bearRenderer;
    private Vector3 originalScale;
    private int currentMode = 0;

    [DllImport("__Internal")]
    private static extern void SendMessageToReactNative(string message);

    void Start()
    {
        // Bear 오브젝트 초기화
        if (bearObject == null)
            bearObject = GameObject.Find("BearObject");
            
        if (bearObject != null)
        {
            bearRenderer = bearObject.GetComponent<Renderer>();
            originalScale = bearObject.transform.localScale;
        }

        // React Native에 Unity 로딩 완료 알림
        SendToReactNative("UNITY_LOADED", "Unity Bear Controller 준비 완료");
        
        Debug.Log("BearSwitcher 초기화 완료");
    }

    // React Native에서 호출할 메인 메서드
    public void OnReactNativeMessage(string jsonData)
    {
        Debug.Log("RN에서 받은 메시지: " + jsonData);
        
        try 
        {
            var data = JsonUtility.FromJson<CommandData>(jsonData);
            
            switch (data.data)
            {
                case "1":
                    SetBearMode(1, "공부 집중 모드");
                    break;
                case "2":
                    SetBearMode(2, "휴식 모드");
                    break;
                case "3":
                    SetBearMode(3, "활동 모드");
                    break;
                case "RESET":
                case "0":
                    ResetBear();
                    break;
                default:
                    Debug.LogWarning("알 수 없는 명령: " + data.data);
                    break;
            }
        } 
        catch (System.Exception e) 
        {
            Debug.LogError("메시지 파싱 오류: " + e.Message);
            
            // 단순 문자열로 재시도
            HandleSimpleCommand(jsonData);
        }
    }

    // 단순 문자열 명령 처리 (백업)
    private void HandleSimpleCommand(string command)
    {
        switch (command)
        {
            case "1":
                SetBearMode(1, "공부 집중 모드");
                break;
            case "2":
                SetBearMode(2, "휴식 모드");
                break;
            case "3":
                SetBearMode(3, "활동 모드");
                break;
            default:
                ResetBear();
                break;
        }
    }

    private void SetBearMode(int mode, string modeName)
    {
        currentMode = mode;
        Debug.Log($"Bear 모드 {mode} 설정: {modeName}");
        
        if (bearObject == null) return;

        // 색상 변경
        if (bearRenderer != null && bearMaterials != null && mode < bearMaterials.Length)
        {
            bearRenderer.material = bearMaterials[mode];
        }
        else
        {
            // Material이 없으면 색상으로 구분
            Color modeColor = GetModeColor(mode);
            if (bearRenderer != null)
                bearRenderer.material.color = modeColor;
        }

        // 애니메이션 실행
        StartCoroutine(BearModeAnimation(mode));
        
        // React Native에 완료 알림
        SendToReactNative("showBearStudy", $"Bear {modeName} 활성화!", mode);
    }

    private Color GetModeColor(int mode)
    {
        switch (mode)
        {
            case 1: return Color.blue;      // 공부 모드 - 파란색
            case 2: return Color.green;     // 휴식 모드 - 초록색  
            case 3: return Color.red;       // 활동 모드 - 빨간색
            default: return Color.white;    // 기본색
        }
    }

    private System.Collections.IEnumerator BearModeAnimation(int mode)
    {
        Transform bearTransform = bearObject.transform;
        
        // 확대 애니메이션
        Vector3 targetScale = originalScale * scaleAnimation;
        float animTime = 0.3f;
        float elapsed = 0f;
        
        while (elapsed < animTime)
        {
            float t = elapsed / animTime;
            bearTransform.localScale = Vector3.Lerp(originalScale, targetScale, t);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        // 회전 애니메이션 (모드별 다른 회전)
        float rotationAmount = mode * 90f; // 모드 1: 90도, 모드 2: 180도, 모드 3: 270도
        float startRotation = bearTransform.eulerAngles.y;
        float targetRotation = startRotation + rotationAmount;
        
        elapsed = 0f;
        while (elapsed < animTime)
        {
            float t = elapsed / animTime;
            float currentRotation = Mathf.Lerp(startRotation, targetRotation, t);
            bearTransform.rotation = Quaternion.Euler(0, currentRotation, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        // 원래 크기로 복원
        elapsed = 0f;
        while (elapsed < animTime)
        {
            float t = elapsed / animTime;
            bearTransform.localScale = Vector3.Lerp(targetScale, originalScale, t);
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        bearTransform.localScale = originalScale;
    }

    private void ResetBear()
    {
        currentMode = 0;
        Debug.Log("Bear 리셋");
        
        if (bearObject == null) return;

        // 원래 색상/Material로 복원
        if (bearRenderer != null)
        {
            if (bearMaterials != null && bearMaterials.Length > 0)
                bearRenderer.material = bearMaterials[0];
            else
                bearRenderer.material.color = Color.white;
        }

        // 원래 Transform으로 복원
        bearObject.transform.rotation = Quaternion.identity;
        bearObject.transform.localScale = originalScale;
        
        SendToReactNative("bear_reset", "Bear 리셋 완료", 0);
    }

    // React Native로 메시지 전송
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
        Debug.Log("에디터에서는 RN 통신 시뮬레이션: " + json);
        #endif
    }

    // 오버로드: 메시지만 전송
    private void SendToReactNative(string type, string message)
    {
        var data = new {
            type = type,
            message = message,
            timestamp = System.DateTimeOffset.Now.ToUnixTimeMilliseconds()
        };
        
        string json = JsonUtility.ToJson(data);
        
        #if UNITY_WEBGL && !UNITY_EDITOR
        SendMessageToReactNative(json);
        #else
        Debug.Log("에디터 시뮬레이션: " + json);
        #endif
    }

    // 테스트용 키보드 입력 (에디터에서만)
    void Update()
    {
        #if UNITY_EDITOR
        if (Input.GetKeyDown(KeyCode.Alpha1))
            OnReactNativeMessage("1");
        if (Input.GetKeyDown(KeyCode.Alpha2))
            OnReactNativeMessage("2");
        if (Input.GetKeyDown(KeyCode.Alpha3))
            OnReactNativeMessage("3");
        if (Input.GetKeyDown(KeyCode.R))
            OnReactNativeMessage("RESET");
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