import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, FormGroup, Label, Input, Button, Table, Alert } from 'reactstrap';
import { useAtomValue, useSetAtom } from 'jotai';
import { userAtom, tokenAtom } from '../atoms';
import { myAxios, imageUrl } from './config';

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

    const handlePayment = (e) => {
        e.preventDefault();

        if (!shippingInfo.recipientName || !shippingInfo.shippingAddress || !shippingInfo.shippingPostcode) {
            alert("배송지 정보를 모두 입력해주세요.");
            return;
        }

        // 주소와 상세주소를 합쳐서 최종 배송지 주소 생성
        const fullShippingAddress = `${shippingInfo.shippingAddress} ${shippingInfo.detailAddress}`;

        if (orderType === 'instant') {
            // 즉시 구매 API 호출
            const instantOrderRequest = {
                productId: orderItems[0].productId,
                quantity: orderItems[0].quantity,
                recipientName: shippingInfo.recipientName,
                shippingAddress: fullShippingAddress,
                shippingPostcode: shippingInfo.shippingPostcode,
            };

            myAxios(token, setToken).post('/orders/instant', instantOrderRequest)
                .then(res => {
                    const orderId = res.data;
                    alert("결제가 완료되었습니다.");
                    navigate(`/order-complete/${orderId}`);
                })
                .catch(err => {
                    console.error("즉시 구매 주문 생성 실패:", err);
                    alert(err.response?.data?.message || "주문 처리 중 오류가 발생했습니다.");
                });
        } else {
            // 장바구니 구매 API 호출
            // 1. 서버에 어떤 상품을 주문할지 먼저 전송 (선택 기능)
            const selectedCartItemIds = orderItems.map(item => item.cartItemId);
            const cartOrderRequest = {
                cartItemIds: selectedCartItemIds,
                recipientName: shippingInfo.recipientName,
                shippingAddress: fullShippingAddress,
                shippingPostcode: shippingInfo.shippingPostcode,
            };
            myAxios(token, setToken).post('/orders', cartOrderRequest)
                .then(res => {
                    const orderId = res.data;
                    alert("결제가 완료되었습니다.");
                    navigate(`/order-complete/${orderId}`);
                })
                .catch(err => {
                    console.error("장바구니 주문 생성 실패:", err);
                    alert(err.response?.data?.message || "주문 처리 중 오류가 발생했습니다.");
                });
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
                                <Button type="button" onClick={handleAddressSearch}>주소 검색</Button>
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
                    <Card body className='text-center p-5 bg-light'>
                        <p>[카카오페이 / 토스 등 간편 결제 API 연동 영역]</p>
                    </Card>
                </section>

                <Button type="submit" color="primary" block style={{ padding: '15px', fontSize: '1.2em' }}>
                    ${totalPrice.toLocaleString()} 결제하기
                </Button>
            </Form>
        </Container>
    );
}