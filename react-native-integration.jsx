// Unity WebGL Bear Controller - React Native WebView 통합 예시
// unitypractice 프로젝트의 기존 구조를 웹뷰 방식으로 변환

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { WebView } from 'react-native-webview';
import Orientation from 'react-native-orientation-locker';
import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { FaceMeshModule } = NativeModules;

// 기존 FaceMesh 설정 유지
const STANDARD_FACE_LANDMARKS = [
  33, 133, 159, 145, 158, 153,      // Right Eye (6개)
  263, 362, 386, 374, 385, 380,     // Left Eye (6개)
];

const UnityWebViewBearController = ({ onGoBack }) => {
    const navigation = useNavigation();
    const webViewRef = useRef(null);
    const cameraReference = useRef(null);
    const faceMeshIntervalRef = useRef(null);

    // Unity WebView 상태
    const [isUnityLoaded, setIsUnityLoaded] = useState(false);
    
    // 기존 FaceMesh 상태들 유지
    const [perm, setPerm] = useState('not-determined');
    const [faceMeshInitialized, setFaceMeshInitialized] = useState(false);
    const [faceCount, setFaceCount] = useState(0);
    const [frameCount, setFrameCount] = useState(0);
    const [validDataCount, setValidDataCount] = useState(0);

    const devices = useCameraDevices();
    const device = devices.front;

    // 화면 방향 설정 (기존과 동일)
    useEffect(() => {
        console.log('Unity WebView 모드: 가로모드 강제');
        Orientation.lockToLandscape();
        
        return () => {
            console.log('Unity WebView 종료: 세로모드 복귀');
            Orientation.lockToPortrait();
            
            if (faceMeshIntervalRef.current) {
                clearInterval(faceMeshIntervalRef.current);
                console.log('FaceMesh 인터벌 정리 완료');
            }
        };
    }, []);

    // 기존 카메라 및 FaceMesh 초기화 로직 유지
    useEffect(() => {
        (async () => {
            console.log('Unity WebView + FaceMesh 초기화 시작');
            const st = await Camera.requestCameraPermission();
            console.log('카메라 권한 결과:', st);
            setPerm(st);
            
            if (st === 'authorized') {
                await initializeFaceMesh();
            }
        })();
    }, []);

    // 기존 FaceMesh 초기화 함수들 유지
    const initializeFaceMesh = async () => {
        if (!FaceMeshModule) {
            console.log('FaceMeshModule이 없습니다');
            return;
        }

        try {
            console.log('Unity WebView용 FaceMesh 초기화 중...');
            await FaceMeshModule.initFaceMesh();
            
            setFaceMeshInitialized(true);
            console.log('Unity WebView용 FaceMesh 초기화 성공');
            
            setupFaceMeshListeners();
            startFaceMeshProcessing();
            
        } catch (err) {
            console.log('FaceMesh 초기화 실패:', err.message);
        }
    };

    const setupFaceMeshListeners = () => {
        // 기존 FaceMesh 리스너 로직 유지 (DeviceEventEmitter 부분)
        // ... (기존 코드와 동일)
    };

    const startFaceMeshProcessing = () => {
        console.log('Unity WebView 백그라운드 FaceMesh 처리 시작');
        let count = 0;
        
        faceMeshIntervalRef.current = setInterval(async () => {
            count++;
            
            try {
                if (!cameraReference.current) return;

                const photo = await cameraReference.current.takePhoto({
                    quality: 60,
                    skipMetadata: true,
                });

                const base64 = await RNFS.readFile(photo.path, 'base64');
                await FaceMeshModule.processCameraFrame(base64);

            } catch (err) {
                if (count % 10 === 0) {
                    console.log(`Unity WebView FaceMesh 처리 오류 #${count}:`, err.message);
                }
            }
        }, 1000);
    };

    // Unity WebView에 명령 전송
    const sendToUnityWebView = (num) => {
        if (!isUnityLoaded) {
            Alert.alert('Unity가 아직 로딩 중입니다.');
            return;
        }
        
        const jsCode = `
            if (window.sendCommandToUnity) {
                window.sendCommandToUnity('BearSwitcher', 'OnReactNativeMessage', '${num}');
            } else {
                console.log('Unity 함수가 준비되지 않았습니다.');
            }
        `;
        
        webViewRef.current?.injectJavaScript(jsCode);
        console.log('Unity WebView로 명령 전송:', num);
    };

    // Unity WebView에서 메시지 받기
    const handleUnityMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('=== Unity WebView 메시지 수신 ===');
            console.log('Parsed data:', data);
            
            // Unity 로딩 완료 처리
            if (data.type === 'UNITY_LOADED') {
                setIsUnityLoaded(true);
                console.log('🎮 Unity WebView 로딩 완료!');
                return;
            }
            
            // 기존 Unity 액션 처리
            if (data.action === 'showBearStudy') {
                console.log('🐻 일어나! (공부 모드) - 진동 시작!');
                if (data.vibrationPattern) {
                    Vibration.vibrate(data.vibrationPattern);
                } else {
                    Vibration.vibrate(200);
                }
            }
            
            if (data.action === 'wake_up_bear') {
                console.log('🐻 일어나! (깨우기) - 진동 시작!');
                Vibration.vibrate([0, 100, 50, 100]);
            }
            
            if (data.action === 'bear_reset') {
                console.log('🐻 Bear 리셋 완료');
            }
            
        } catch (error) {
            console.log('❌ Unity WebView 메시지 파싱 오류:', error);
            console.log('❌ 원본 메시지:', event.nativeEvent.data);
        }
    };

    return (
        <View style={styles.overlayContainer}>
            {/* Unity WebView - 기존 UnityView 대신 */}
            <WebView
                ref={webViewRef}
                source={{ uri: 'https://[username].github.io/unity-webgl-bear/' }}
                style={styles.unityWebView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                mixedContentMode="compatibility"
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                onMessage={handleUnityMessage}
                onLoadEnd={() => {
                    console.log('Unity WebView 로딩 완료');
                }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('Unity WebView 에러:', nativeEvent);
                    Alert.alert('Unity 로딩 실패', 'Unity WebView를 로드할 수 없습니다.');
                }}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Unity Bear 로딩 중...</Text>
                    </View>
                )}
            />

            {/* 기존 미니샷 카메라 오버레이 유지 */}
            {device && perm === 'authorized' && (
                <View style={styles.miniCameraContainer}>
                    <Camera
                        ref={cameraReference}
                        style={styles.miniCamera}
                        device={device}
                        isActive={true}
                        photo
                    />
                    
                    <View style={styles.miniStatus}>
                        <Text style={styles.miniStatusText}>
                            FaceMesh: {faceMeshInitialized ? '활성' : '비활성'}
                        </Text>
                        <Text style={styles.miniStatusText}>
                            Unity: {isUnityLoaded ? '준비됨' : '로딩 중'}
                        </Text>
                        <Text style={styles.miniStatusText}>
                            얼굴: {faceCount} | 프레임: {frameCount}
                        </Text>
                    </View>
                </View>
            )}

            {/* 기존 컨트롤 버튼들 유지 */}
            <View style={styles.controlButtons}>
                {[1,2,3].map((num) => (
                    <TouchableOpacity
                        key={num}
                        onPress={() => sendToUnityWebView(num)}
                        style={[
                            styles.numberButton,
                            !isUnityLoaded && styles.disabledButton
                        ]}
                        disabled={!isUnityLoaded}
                    >
                        <Text style={styles.numberButtonText}>{num}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* 기존 닫기 버튼 로직 유지 */}
            <TouchableOpacity
                onPress={() => {
                    console.log('Unity WebView 닫기 버튼 클릭');
                    
                    // Unity 리셋 명령 전송
                    if (isUnityLoaded) {
                        const resetCode = `
                            if (window.sendCommandToUnity) {
                                window.sendCommandToUnity('BearSwitcher', 'OnReactNativeMessage', 'RESET');
                            }
                        `;
                        webViewRef.current?.injectJavaScript(resetCode);
                    }
                    
                    // 세로모드 복귀
                    Orientation.lockToPortrait();
                    
                    setTimeout(() => {
                        console.log('홈으로 돌아가기 실행');
                        navigation.goBack();
                    }, 100);
                }}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>← 닫기</Text>
            </TouchableOpacity>

            {/* Unity 로딩 상태 표시 */}
            {!isUnityLoaded && (
                <View style={styles.unityStatusContainer}>
                    <Text style={styles.unityStatusText}>
                        Unity WebView 로딩 중...
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // 기존 스타일들 유지하면서 WebView 관련 추가
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
    },
    unityWebView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        backgroundColor: '#1a1a1a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    unityStatusContainer: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        borderRadius: 4,
        zIndex: 6,
    },
    unityStatusText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    disabledButton: {
        opacity: 0.5,
    },
    // 기존 스타일들...
    miniCameraContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 1,
        height: 1,
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 5,
    },
    miniCamera: {
        flex: 1,
    },
    miniStatus: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 2,
    },
    miniStatusText: {
        color: '#fff',
        fontSize: 8,
        fontFamily: 'monospace',
    },
    controlButtons: {
        position: 'absolute', 
        bottom: 60, 
        left: 0, 
        right: 0, 
        flexDirection: 'row',
        justifyContent: 'space-around', 
        paddingHorizontal: 18, 
        zIndex: 2
    },
    numberButton: {
        backgroundColor: 'rgba(34, 34, 34, 0.7)',
        borderRadius: 30,
        paddingVertical: 16,
        paddingHorizontal: 28,
        marginHorizontal: 8,
    },
    numberButtonText: {
        color: '#fff', 
        fontSize: 24, 
        fontWeight: 'bold'
    },
    closeButton: {
        position: 'absolute', 
        top: 50, 
        left: 20, 
        zIndex: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        padding: 12, 
        borderRadius: 8
    },
    closeButtonText: {
        color: '#fff', 
        fontSize: 16,
        fontWeight: '600'
    },
});

export default UnityWebViewBearController;