import { Button, Form, FormGroup, Label, Input, Modal, ModalHeader, ModalBody, ModalFooter, FormText } from 'reactstrap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { myAxios } from './config';

export default function JoinSeller() {
    const [seller, setSeller] = useState({
        email: '',
        password: '',
        username: '',
        companyName: '',
        companyNumber: '',
        phoneNumber: ''
    });
    const [modal, setModal] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const divStyle = {
        margin: "20px auto",
        width: '600px',
        border: '1px solid lightgray',
        borderRadius: '10px',
        padding: '30px'
    };

    const changeInput = (e) => {
        setSeller({ ...seller, [e.target.name]: e.target.value });
    };

    const submit = (e) => {
        e.preventDefault();
        myAxios().post(`/auth/signup/seller`, seller)
            .then(res => {
                setMessage("판매자 입점 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.");
                setModal(true);
                setTimeout(() => {
                    setModal(false);
                    navigate('/login-seller');
                }, 3000);
            })
            .catch(err => {
                console.error(err);
                setMessage(err.response?.data?.message || "입점 신청 중 오류가 발생했습니다.");
                setModal(true);
            });
    };

    return (
        <>
            <h2 className='text-center mt-4 mb-4'>판매자 입점신청</h2>
            <Form onSubmit={submit} style={divStyle}>
                <fieldset className='mb-4'>
                    <legend className='fs-5 fw-bold'>로그인 정보</legend>
                    <FormGroup>
                        <Label for="email">이메일 (ID):</Label>
                        <Input type="email" name="email" id="email" required onChange={changeInput} />
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">비밀번호:</Label>
                        <Input type="password" name="password" id="password" required onChange={changeInput} />
                    </FormGroup>
                </fieldset>
                <fieldset>
                    <legend className='fs-5 fw-bold'>사업자 정보</legend>
                    <FormGroup>
                        <Label for="companyName">상호명:</Label>
                        <Input type="text" name="companyName" id="companyName" required onChange={changeInput} />
                    </FormGroup>
                    <FormGroup>
                        <Label for="companyNumber">사업자등록번호:</Label>
                        <Input type="text" name="companyNumber" id="companyNumber" required onChange={changeInput} />
                    </FormGroup>
                    <FormGroup>
                        <Label for="phoneNumber">연락처:</Label>
                        <Input type="tel" name="phoneNumber" id="phoneNumber" required onChange={changeInput} />
                    </FormGroup>
                </fieldset>
                <Button color="primary" block className='mt-4'>입점 신청하기</Button>
            </Form>
            <Modal isOpen={modal} toggle={() => setModal(false)}>
                <ModalHeader toggle={() => setModal(false)}>알림</ModalHeader>
                <ModalBody>{message}</ModalBody>
            </Modal>
        </>
    );
}