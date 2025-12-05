import { Table, Label, Input, Button, Form, FormGroup } from 'reactstrap'
import { useState } from 'react'
import { myAxios, baseUrl } from './config.jsx'
import { userAtom, tokenAtom } from '../atoms.jsx'
import { useSetAtom, useAtom } from 'jotai/react'
import { useNavigate } from 'react-router'

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("");
    const setUser = useSetAtom(userAtom);
    const [token, setToken] = useAtom(tokenAtom);
    const navigate = useNavigate();

    const divStyle = {
        margin: "20px auto",
        width: '500px',
        border: '1px solid lightgray',
        borderRadius: '10px',
        padding: '30px'
    }

    const submit = (e) => {
        e.preventDefault();
        myAxios(null, setToken).post(`/auth/login`, { username: email, password })
            .then(res => {
                if (res.data) {
                    setUser(res.data);
                    navigate("/");
                }
            })
            .catch(err => {
                console.log(err)
                alert(err.response?.data?.message || "로그인 중 오류가 발생했습니다.");
            })
    }

    const socialLogin = (provider) => {
        window.location.href = `${baseUrl}/oauth2/authorization/${provider}`;
    };

    return (
        <>
            <h2 className='text-center mt-4 mb-4'>로그인 (일반 사용자)</h2>
            <div style={divStyle}>
                <Form onSubmit={submit}>
                    <FormGroup>
                        <Label for="email">이메일:</Label>
                        <Input type="email" name="email" id="email" required onChange={(e) => setEmail(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">비밀번호:</Label>
                        <Input type="password" name="password" id="password" required onChange={(e) => setPassword(e.target.value)} />
                    </FormGroup>
                    <Button color="primary" block>로그인</Button>
                </Form>
                {/* <div className="social-login text-center mt-4 pt-4 border-top">
                    <p>--- 또는 소셜 계정으로 로그인 ---</p>
                    <Button color="secondary" onClick={() => socialLogin('google')} style={{ backgroundColor: '#DB4437', color: 'white', marginRight: '10px' }}>Google</Button>
                    <Button color="secondary" onClick={() => socialLogin('naver')} style={{ backgroundColor: '#03C75A', color: 'white', marginRight: '10px' }}>Naver</Button>
                    <Button color="secondary" onClick={() => socialLogin('kakao')} style={{ backgroundColor: '#FEE500', color: '#000000' }}>Kakao</Button>
                </div> */}
                <p className="mt-4 text-center">계정이 없으신가요? <a href="/join">회원가입</a></p>
            </div>
        </>
    )
}