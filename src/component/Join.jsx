import { Button, Form, FormGroup, Label, Input, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { myAxios } from './config';

export default function Join() {
    const [user, setUser] = useState({ email: '', password: '', username: '' });
    const [modal, setModal] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const divStyle = {
        margin: "20px auto",
        width: '600px',
        border: '1px solid lightgray',
        borderRadius: '10px',
        padding: '30px'
    }

    const changeInput = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    }

    const submit = (e) => {
        e.preventDefault();
        myAxios().post(`/auth/signup/user`, user)
            .then(res => {
                setMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
                setModal(true);
                setTimeout(() => {
                    setModal(false);
                    navigate('/login');
                }, 2000);
            })
            .catch(err => {
                console.log(err);
                setMessage(err.response?.data?.message || "회원가입 중 오류가 발생했습니다.");
                setModal(true);
            });
    }

    return (
        <>
            <h2 className='text-center mt-4 mb-4'>회원가입</h2>
            <Form onSubmit={submit} style={divStyle}>
                <FormGroup>
                    <Label for="email">이메일 (ID):</Label>
                    <Input type="email" name="email" id="email" required onChange={changeInput} />
                </FormGroup>
                <FormGroup>
                    <Label for="password">비밀번호:</Label>
                    <Input type="password" name="password" id="password" required onChange={changeInput} />
                </FormGroup>
                <FormGroup>
                    <Label for="username">닉네임:</Label>
                    <Input type="text" name="username" id="username" required onChange={changeInput} />
                </FormGroup>
                <Button color="primary" block>회원가입</Button>
            </Form>
            <Modal isOpen={modal}>
                <ModalHeader>알림</ModalHeader>
                <ModalBody>{message}</ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => setModal(false)}>확인</Button>
                </ModalFooter>
            </Modal>
        </>
    )
}