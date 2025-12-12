import axios from "axios";
export const baseUrl = "http://3.107.113.16:8080/api";
export const imageUrl = baseUrl + "/files/images/";
export const reactUrl = "http://54.252.154.217";

export const myAxios = (token, setToken) => {
    let instance = axios.create({
        baseURL : baseUrl,
        timeout:7000,
    })

    instance.interceptors.response.use(  
        (response) => {  //응답이 올때마다 헤더에 토큰 유무 체크하여 토큰 갱신
            if (!response.config.disableLogging) { // 요청 시 disableLogging: true가 설정되어 있으면 콘솔 로그를 건너뜁니다.
                console.log(response);
            }
            if(response.headers.authorization) {
                setToken(response.headers.authorization)
            }
            return response;
        }
        ,
        (error) => {  //error  발생시 처리
            if (!error.config.disableLogging) { // 요청 시 disableLogging: true가 설정되어 있으면 콘솔 로그를 건너뜁니다.
                console.log(error);
            }
            if(error.response && error.response.status) {
                switch(error.response.status) {
                    case 401:
                    case 403: {
                        // sessionStorage에서 사용자 정보를 읽어 역할에 맞는 로그인 페이지로 리디렉션
                        const userSession = sessionStorage.getItem('user');
                        const user = userSession ? JSON.parse(userSession) : null;

                        if (user && user.role === 'ADMIN') {
                            window.location.href = `${reactUrl}/login-admin`;
                        } else if (user && user.role === 'SELLER') {
                            window.location.href = `${reactUrl}/login-seller`;
                        } else {
                            window.location.href = `${reactUrl}/login`;
                        }
                        break;
                    }
                    default:
                        return Promise.reject(error)
                }
            }
            return Promise.reject(error);
        }
    )

    // 요청 인터셉터: 파라미터로 받은 token 대신 sessionStorage에서 직접 읽어 사용
    instance.interceptors.request.use((config)=> {
        // sessionStorage에서 직접 토큰을 가져옵니다.
        const sessionToken = JSON.parse(sessionStorage.getItem('token'));
        if (sessionToken) config.headers.Authorization = sessionToken;
        return config;
    })

    return instance;
}