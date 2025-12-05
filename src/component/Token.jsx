import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { tokenAtom, fcmTokenAtom, userAtom } from '../atoms'; // atom 경로 확인 필요
import { myAxios } from './config';

export default function Token() {
    let params = new URL(window.location.href).searchParams;
    let tokenParam = params.get("token");
    
    let [token, setToken] = useAtom(tokenAtom);
    let fcmToken = useAtomValue(fcmTokenAtom);
    let setUser = useSetAtom(userAtom);
    
    const navigate = useNavigate();

    // 1. URL에 토큰이 있다면 Atom에 저장 (최초 1회만 실행)
    useEffect(() => {
        if (tokenParam) {
            console.log("URL Token:", tokenParam);
            setToken(tokenParam);
        }
    }, [tokenParam, setToken]);

    // 2. 토큰(Atom)과 FCM토큰이 모두 준비되면 서버로 전송
    useEffect(() => {
        // 토큰이 없거나, FCM 토큰이 아직 로드되지 않았으면 대기
        if (!token) return; 

        let formData = new FormData();
        // fcmToken이 null일 수도 있으므로 체크하거나, 빈 문자열이라도 보낼지 결정 필요
        if (fcmToken) {
            formData.append("fcmToken", fcmToken);
        }

        myAxios(token, setToken).get("/user/me")
            .then(res => {
                setUser(res.data);
                navigate("/");
            })
            .catch(err => {
                console.log(err);
            });
            
    }, [token, fcmToken, setUser, navigate]); // 의존성 배열에 fcmToken 추가

    return (<></>);
}