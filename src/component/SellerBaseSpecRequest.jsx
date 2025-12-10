import { useState } from 'react';
import { Container, Form, FormGroup, Label, Input, Button, Spinner, Alert, Card, CardBody } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function SellerBaseSpecRequest() {
    const [request, setRequest] = useState({
        requestedModelName: '',
        category: 'CPU',
        manufacturer: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setRequest({ ...request, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        myAxios(token, setToken).post('/seller/base-spec-requests', request)
            .then(() => {
                setSuccess("기반 모델 등록 요청이 성공적으로 접수되었습니다. 관리자 승인 후 상품 등록이 가능합니다.");
                setTimeout(() => navigate('/seller-center'), 3000);
            })
            .catch(err => {
                setError(err.response?.data?.message || "모델 등록 요청 중 오류가 발생했습니다.");
            })
            .finally(() => setLoading(false));
    };

    return (
        <Container className='mt-4' style={{ maxWidth: '700px' }}>
            <Button tag={Link} to="/seller/products/new" color="secondary" outline className='mb-4'>&laquo; 상품 등록으로 돌아가기</Button>
            <h2 className='page-title'>신규 기반 모델 등록 요청</h2>
            <p>SOMACOM에 없는 부품 모델의 등록을 관리자에게 요청합니다.</p>

            {error && <Alert color="danger">{error}</Alert>}
            {success && <Alert color="success">{success}</Alert>}

            <Card body>
                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Label for="requestedModelName">요청 모델명 *</Label>
                        <Input type="text" id="requestedModelName" name="requestedModelName" value={request.requestedModelName} onChange={handleInputChange} placeholder="예: Nvidia RTX 5090" required />
                    </FormGroup>
                    <FormGroup>
                        <Label for="category">부품 카테고리 *</Label>
                        <Input type="select" id="category" name="category" value={request.category} onChange={handleInputChange}>
                            <option value="CPU">CPU</option>
                            <option value="Motherboard">Motherboard</option>
                            <option value="RAM">RAM</option>
                            <option value="GPU">GPU</option>
                            {/* 필요 시 다른 카테고리 추가 */}
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label for="manufacturer">제조사 *</Label>
                        <Input type="text" id="manufacturer" name="manufacturer" value={request.manufacturer} onChange={handleInputChange} placeholder="예: NVIDIA, Intel, ASUS" required />
                    </FormGroup>
                    <Button type="submit" color="primary" block disabled={loading}>
                        {loading ? <Spinner size="sm" /> : '등록 요청하기'}
                    </Button>
                </Form>
            </Card>
        </Container>
    );
}