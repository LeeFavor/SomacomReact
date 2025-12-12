import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, FormGroup, Label, Input, Button, Table, Alert } from 'reactstrap';
import { useAtomValue, useSetAtom } from 'jotai';
import { userAtom, tokenAtom } from '../atoms';
import { myAxios, imageUrl } from './config';

// 토스페이먼츠 테스트용 클라이언트 키
const clientKey = 'test_ck_Z61JOxRQVEab6wPpyJl0VW0X9bAq';

export default function Order() {
    const location = useLocation();
    const navigate = useNavigate();

    const user = useAtomValue(userAtom);
    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    const [orderItems, setOrderItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [orderType, setOrderType] = useState('cart'); // 'cart' or 'instant'
    const [shippingInfo, setShippingInfo] = useState({
        recipientName: user.username || '',
        shippingAddress: '',
        detailAddress: '', // 상세 주소 필드 추가
        shippingPostcode: '',
    });

    useEffect(() => {
        // 이전 페이지(Cart, ProductDetail)에서 state로 전달받은 상품 정보
        const { items, price, type } = location.state || {};

        if (!items || items.length === 0) {
            alert("주문할 상품이 없습니다. 장바구니로 돌아갑니다.");
            navigate('/cart');
            return;
        }

        setOrderItems(items);
        setTotalPrice(price);
        if (type) setOrderType(type);
    }, [location.state, navigate]);

    const handleShippingInfoChange = (e) => {
        setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
    };

    const handleAddressSearch = () => {
        new window.daum.Postcode({
            oncomplete: function(data) {
                // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.
                let addr = ''; // 주소 변수

                //사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
                if (data.userSelectedType === 'R') { // 사용자가 도로명 주소를 선택했을 경우
                    addr = data.roadAddress;
                } else { // 사용자가 지번 주소를 선택했을 경우(J)
                    addr = data.jibunAddress;
                }

                // 우편번호와 주소 정보를 해당 필드에 넣는다.
                setShippingInfo(prev => ({ ...prev, shippingPostcode: data.zonecode, shippingAddress: addr }));
            }
        }).open();
    };

    const handlePayment = async (e) => {
        e.preventDefault();

        if (!shippingInfo.recipientName || !shippingInfo.shippingAddress || !shippingInfo.shippingPostcode) {
            alert("배송지 정보를 모두 입력해주세요.");
            return;
        }

        // 주소와 상세주소를 합쳐서 최종 배송지 주소 생성
        const fullShippingAddress = `${shippingInfo.shippingAddress} ${shippingInfo.detailAddress}`;

        const orderRequest = orderType === 'instant'
            ? { // 즉시 구매 요청 본문
                productId: orderItems[0].productId,
                quantity: orderItems[0].quantity,
                recipientName: shippingInfo.recipientName,
                shippingAddress: fullShippingAddress,
                shippingPostcode: shippingInfo.shippingPostcode,
            }
            : { // 장바구니 구매 요청 본문
                cartItemIds: orderItems.map(item => item.cartItemId),
                recipientName: shippingInfo.recipientName,
                shippingAddress: fullShippingAddress,
                shippingPostcode: shippingInfo.shippingPostcode,
            };

        const orderUrl = orderType === 'instant' ? '/orders/instant' : '/orders';

        try {
            // 1. 백엔드에 '결제 대기(PENDING)' 상태의 주문 생성 요청
            const response = await myAxios(token, setToken).post(orderUrl, orderRequest);
            const paymentOrderId = response.data; // 백엔드에서 생성한 고유 주문 ID

            // 2. 토스페이먼츠 일반 결제창 호출
            const tossPayments = window.TossPayments(clientKey);
            await tossPayments.requestPayment('카드', { // '카드' 이외에 다른 결제수단도 가능
                orderId: paymentOrderId,
                orderName: orderItems.length > 1 ? `${orderItems[0].productName} 외 ${orderItems.length - 1}건` : orderItems[0].productName,
                amount: Math.round(totalPrice),
                successUrl: `${window.location.origin}/payment-success`, // 결제 성공 시 리디렉션될 URL
                failUrl: `${window.location.origin}/payment-fail`,       // 결제 실패 시 리디렉션될 URL
                customerName: user.username,
                customerEmail: user.email,
            });

        } catch (err) {
            console.error("주문 생성 또는 결제 요청 실패:", err);
            alert(err.response?.data?.message || "주문 처리 중 오류가 발생했습니다.");
        }
    };

    if (orderItems.length === 0) {
        return <Container className='mt-4'><Alert color="warning">주문할 상품을 선택해주세요.</Alert></Container>;
    }

    return (
        <Container className="page my-4">
            <h2 className="page-title">결제 페이지</h2>

            <Form onSubmit={handlePayment}>
                <section id="order-summary" className='mb-5'>
                    <h3>주문 요약</h3>
                    <Table>
                        <thead>
                            <tr><th>이미지</th><th>상품명</th><th>수량</th><th>금액</th></tr>
                        </thead>
                        <tbody>
                            {orderItems.map(item => (
                                <tr key={item.productId}>
                                    <td><img src={`${imageUrl}${item.imageUrl}`} alt={item.productName} style={{ width: '80px', borderRadius: '6px' }} /></td>
                                    <td>{item.productName}</td>
                                    <td>{item.quantity}</td>
                                    <td>${(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    <h4 className='text-end'>총 결제 금액: <span className='text-primary'>${totalPrice.toLocaleString()}</span></h4>
                </section>

                <section id="shipping-info" className='mb-5'>
                    <h3>배송지 정보</h3>
                    <Card body>
                        <FormGroup>
                            <Label for="recipientName">받는 사람:</Label>
                            <Input type="text" id="recipientName" name="recipientName" value={shippingInfo.recipientName} onChange={handleShippingInfoChange} required />
                        </FormGroup>
                        <FormGroup>
                            <Label for="shippingPostcode">주소:</Label>
                            <div className='d-flex gap-2'>
                                <Input type="text" id="shippingPostcode" name="shippingPostcode" value={shippingInfo.shippingPostcode} placeholder='우편번호' readOnly required />
                                <Button type="button" onClick={handleAddressSearch} style={{ whiteSpace: 'nowrap' }}>주소검색</Button>
                            </div>
                        </FormGroup>
                        <FormGroup>
                            <Input type="text" id="shippingAddress" name="shippingAddress" value={shippingInfo.shippingAddress} placeholder='주소' readOnly required />
                        </FormGroup>
                        <FormGroup>
                            <Input type="text" id="detailAddress" name="detailAddress" value={shippingInfo.detailAddress} placeholder='상세주소' onChange={handleShippingInfoChange} required />
                        </FormGroup>
                    </Card>
                </section>

                <section id="payment-method" className='mb-5'>
                    <h3>결제 수단</h3>
                    {/* 일반 결제 방식에서는 별도의 UI 렌더링 영역이 필요 없습니다. */}
                    <Card body>결제하기 버튼을 누르면 토스페이먼츠 결제창이 뜹니다.</Card>
                </section>

                <Button type="submit" color="primary" block style={{ padding: '15px', fontSize: '1.2em' }}>
                    ${totalPrice.toLocaleString()} 결제하기
                </Button>
            </Form>
        </Container>
    );
}