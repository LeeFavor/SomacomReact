import { Form, FormGroup, Label, Input, Button } from 'reactstrap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom, useAtom } from 'jotai/react';
import { userAtom, tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function LoginTemplate({ title, role }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const setUser = useSetAtom(userAtom);
    const setToken = useSetAtom(tokenAtom);
    const navigate = useNavigate();

    const divStyle = {
        margin: "20px auto",
        width: '500px',
        border: '1px solid lightgray',
        borderRadius: '10px',
        padding: '30px'
    };

    const submit = (e) => {
        e.preventDefault();
        myAxios(null, setToken).post(`/auth/login`, { username: email, password })
            .then(res => {
                // 로그인 응답 본문에 role이 있는지, 그리고 그 role이 기대하는 role과 맞는지 확인
                // 백엔드 응답: { role: "SELLER" }, 프론트엔드 기대값: "ROLE_SELLER"
                if (res.data && res.data.role && role === `ROLE_${res.data.role}`) {
                    setUser(res.data);
                    navigate("/");
                } else {
                    alert(`'${role.replace('ROLE_', '')}' 권한이 없거나, 로그인 정보가 잘못되었습니다.`);
                }
            })
            .catch(err => {
                console.error(err);
                alert(err.response?.data?.message || "로그인 중 오류가 발생했습니다.");
            });
    };

    return (
        <>
            <h2 className='text-center mt-4 mb-4'>{title}</h2>
            <div style={divStyle}>
                <Form onSubmit={submit}>
                    <FormGroup>
                        <Label for="email">이메일 (ID):</Label>
                        <Input type="email" id="email" required onChange={(e) => setEmail(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">비밀번호:</Label>
                        <Input type="password" id="password" required onChange={(e) => setPassword(e.target.value)} />
                    </FormGroup>
                    <Button color="primary" block>{title}</Button>
                </Form>
            </div>
        </>
    );
}