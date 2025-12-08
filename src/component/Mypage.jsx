import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, FormGroup, Label, Input, Button, Table, Pagination, PaginationItem, PaginationLink, Spinner, Alert } from 'reactstrap';
import { useAtom, useSetAtom } from 'jotai';
import { userAtom, tokenAtom } from '../atoms';
import { myAxios } from './config';
import { Link, useSearchParams } from 'react-router-dom';

export default function Mypage() {
    const [user, setUser] = useAtom(userAtom);
    const [token, setToken] = useAtom(tokenAtom);

    const [password, setPassword] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [confirmError, setConfirmError] = useState('');

    const [orders, setOrders] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [loading, setLoading] = useState(true);

    const [editInfo, setEditInfo] = useState({ username: '', currentPassword: '', newPassword: '' });
    const [editSuccess, setEditSuccess] = useState('');

    const [searchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    // 비밀번호 확인 핸들러
    const handleConfirmPassword = (e) => {
        e.preventDefault();
        setConfirmError('');
        // 로그인 API를 사용하여 비밀번호 유효성 검증
        myAxios(token, setToken).post('/auth/login', { username: user.email, password })
            .then(() => {
                setIsConfirmed(true);
                // 정보 수정 시 필요한 현재 비밀번호를 미리 저장
                setEditInfo(prev => ({ ...prev, currentPassword: password }));
            })
            .catch(() => {
                setConfirmError('비밀번호가 일치하지 않습니다.');
            });
    };

    // 정보 수정 핸들러
    const handleEditInfo = (e) => {
        e.preventDefault();
        setEditSuccess('');
        myAxios(token, setToken).put('/user/me', editInfo)
            .then(() => {
                setEditSuccess('회원 정보가 성공적으로 수정되었습니다.');
                // Jotai userAtom 업데이트
                setUser(prev => ({ ...prev, username: editInfo.username }));
            })
            .catch(err => {
                alert(err.response?.data?.message || "정보 수정 중 오류가 발생했습니다.");
            });
    };

    // 주문 내역 조회 (인증 완료 후)
    useEffect(() => {
        if (isConfirmed) {
            setLoading(true);
            setEditInfo(prev => ({ ...prev, username: user.username })); // 폼 초기값 설정

            myAxios(token, setToken).get('/orders', { params: { page, size: 5 } })
                .then(res => {
                    setOrders(res.data.content);
                    setPageInfo({
                        totalPages: res.data.totalPages,
                        number: res.data.number,
                    });
                })
                .catch(err => console.error("주문 내역 조회 실패:", err))
                .finally(() => setLoading(false));
        }
    }, [isConfirmed, page, token, setToken, user.username]);

    if (!token) {
        return <Container className='mt-4'><Alert color="warning">로그인이 필요합니다.</Alert></Container>;
    }

    // 1. 비밀번호 확인 뷰
    if (!isConfirmed) {
        return (
            <Container className='mt-4' style={{ maxWidth: '500px' }}>
                <h2 className='page-title'>회원 정보 보호</h2>
                <Card body>
                    <p>개인정보를 안전하게 보호하기 위해 비밀번호를 다시 한번 확인합니다.</p>
                    <Form onSubmit={handleConfirmPassword}>
                        <FormGroup>
                            <Label for="confirm-password">비밀번호:</Label>
                            <Input type="password" id="confirm-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </FormGroup>
                        {confirmError && <Alert color="danger">{confirmError}</Alert>}
                        <Button type="submit" color="primary" block>확인</Button>
                    </Form>
                </Card>
            </Container>
        );
    }

    // 2. 마이페이지 콘텐츠 뷰
    return (
        <Container className='mt-4'>
            <h2 className='page-title'>마이페이지</h2>

            <section id="order-list">
                <h3>주문 목록</h3>
                {loading ? <Spinner /> : (
                    <Table striped>
                        <thead>
                            <tr><th>주문번호</th><th>주문일</th><th>상품</th><th>결제 금액</th><th>배송 상태</th></tr>
                        </thead>
                        <tbody>
                            {orders && orders.length > 0 ? ( // 1. 조건부 렌더링 로직 개선
                                orders.map(order => ( // 2. 불필요한 중괄호 제거
                                <tr key={order.orderId}>
                                    <td>{order.orderId}</td>
                                    <td>{new Date(order.orderedAt).toLocaleDateString()}</td>
                                    <td>{order.representativeProductName}</td>
                                    <td>${order.totalPrice.toLocaleString()}</td>
                                    <td className='fw-bold'>{order.status}</td>
                                </tr>
                            )) // 2. 불필요한 중괄호 제거
                            ) : (
                                // 3. "주문 없음" 표시 방법을 올바른 테이블 구조로 수정
                                <tr><td colSpan="5" className="text-center">주문 내역이 없습니다.</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        {[...Array(pageInfo.totalPages || 0).keys()].map(i => (
                            <PaginationItem key={i} active={i === pageInfo.number}>
                                <Link to={`/mypage?page=${i}`} className="page-link">{i + 1}</Link>
                            </PaginationItem>
                        ))}
                    </Pagination>
                </div>
            </section>

            <hr className='my-5' />

            <section id="user-info-edit">
                <h3>회원 정보 수정</h3>
                <Card body>
                    <Form onSubmit={handleEditInfo} style={{ maxWidth: '600px' }}>
                        <FormGroup>
                            <Label>이메일 (ID):</Label>
                            <Input type="email" value={user.email} disabled />
                        </FormGroup>
                        <FormGroup>
                            <Label for="edit-username">닉네임:</Label>
                            <Input
                                type="text"
                                id="edit-username"
                                value={editInfo.username}
                                onChange={(e) => setEditInfo({ ...editInfo, username: e.target.value })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label for="edit-password">새 비밀번호 (변경 시 입력):</Label>
                            <Input
                                type="password"
                                id="edit-password"
                                placeholder='새 비밀번호를 입력하세요'
                                value={editInfo.newPassword}
                                onChange={(e) => setEditInfo({ ...editInfo, newPassword: e.target.value })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label for="current-password">현재 비밀번호:</Label>
                            <Input
                                type="password"
                                id="current-password"
                                placeholder='정보를 수정하려면 현재 비밀번호를 입력하세요'
                                value={editInfo.currentPassword}
                                onChange={(e) => setEditInfo({ ...editInfo, currentPassword: e.target.value })}
                                required
                            />
                        </FormGroup>
                        {editSuccess && <Alert color="success">{editSuccess}</Alert>}
                        <Button type="submit" color="primary">정보 수정</Button>
                    </Form>
                </Card>
            </section>
        </Container>
    );
}