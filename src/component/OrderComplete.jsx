import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, CardBody, Button, Spinner, Alert, ListGroup, ListGroupItem } from 'reactstrap';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';

export default function OrderComplete() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    useEffect(() => {
        if (!orderId) {
            setError("주문 번호를 찾을 수 없습니다.");
            setLoading(false);
            return;
        }

        myAxios(token, setToken).get(`/orders/${orderId}`)
            .then(res => {
                setOrder(res.data);
            })
            .catch(err => {
                console.error("주문 상세 정보 조회 실패:", err);
                setError("주문 정보를 불러오는 데 실패했습니다. 로그인 상태를 확인하거나, 올바른 주문 번호인지 확인해주세요.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [orderId, token, setToken]);

    if (loading) {
        return <Container className="text-center p-5"><Spinner>Loading...</Spinner></Container>;
    }

    if (error) {
        return <Container className="mt-4"><Alert color="danger">{error}</Alert></Container>;
    }

    if (!order) {
        return <Container className="mt-4"><Alert color="warning">주문 정보를 찾을 수 없습니다.</Alert></Container>;
    }

    return (
        <Container className="page my-4">
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <h2 className="page-title" style={{ color: '#10b981', border: 'none', fontSize: '2em' }}>
                    ✅ 주문이 성공적으로 완료되었습니다.
                </h2>
                <p>주문번호: <strong>{order.orderId}</strong></p>

                <Card body className="text-start mx-auto mt-4" style={{ maxWidth: '700px', backgroundColor: '#f9fafb' }}>
                    <h4 className='mb-3'>주문 요약</h4>
                    <ListGroup flush className='mb-3'>
                        {order.orderItems.map(item => (
                            <ListGroupItem key={item.productId} className='d-flex justify-content-between align-items-center'>
                                <span>{item.productName} x {item.quantity}</span>
                                <span>${(item.priceAtPurchase * item.quantity).toLocaleString()}</span>
                            </ListGroupItem>
                        ))}
                    </ListGroup>

                    <hr />

                    <h4 className='mb-3'>배송지 정보</h4>
                    <p style={{ margin: 0 }}>
                        받는 사람: {order.recipientName}<br />
                        주소: ({order.shippingPostcode}) {order.shippingAddress}<br />
                    </p>

                    <hr />

                    <h4 className='mb-3'>결제 정보</h4>
                    <p style={{ margin: 0 }}>
                        <strong>총 결제 금액: ${order.totalPrice.toLocaleString()}</strong><br />
                        결제 수단: {order.paymentMethod || '간편 결제'}
                    </p>
                </Card>

                <div style={{ marginTop: '30px' }}>
                    <Link to="/" className="btn btn-secondary">
                        계속 쇼핑하기
                    </Link>
                    <Link to="/mypage" className="btn btn-primary" style={{ marginLeft: '10px' }}>
                        주문 내역 확인 (마이페이지)
                    </Link>
                </div>
            </div>
        </Container>
    );
}