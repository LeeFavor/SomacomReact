import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Input, Table, Alert } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '../atoms';

export default function Cart() {
    const [cart, setCart] = useState(null);
    const [checkedItems, setCheckedItems] = useState(new Set());
    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    // UI 상에서만 변경되는 수량을 임시 저장하는 상태
    const [quantityChanges, setQuantityChanges] = useState({}); // { cartItemId: newQuantity }
    const user = useAtomValue(userAtom);
    const navigate = useNavigate();

    const fetchCart = () => {
        if (!token) return;
        myAxios(token, setToken).get('/cart') // GET /api/cart
            .then(res => {
                setCart(res.data);
                // 초기에 모든 아이템 선택
                if (res.data && res.data.items) { // api.md: cartItems -> items
                    const allItemIds = new Set(res.data.items.map(item => item.cartItemId));
                    setCheckedItems(allItemIds);
                }
                setQuantityChanges({}); // 수량 변경 상태 초기화
            })
            .catch(err => {
                console.error("장바구니 조회 실패:", err);
                // 장바구니가 비어있거나 오류 발생 시 초기 상태 설정 (api.md에 맞춰)
                setCart({ items: [], totalPrice: 0, compatibilityResult: { status: 'EMPTY', messages: ['장바구니가 비어있습니다.'] } });
            });
    };

    useEffect(() => {
        if (token) {
            fetchCart();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, setToken]);

    const handleCheckChange = (id) => {
        const newCheckedItems = new Set(checkedItems);
        if (newCheckedItems.has(id)) {
            newCheckedItems.delete(id);
        } else {
            newCheckedItems.add(id);
        }
        setCheckedItems(newCheckedItems);
    };

    const handleQuantityChange = (cartItemId, newQuantity) => {
        const parsedQuantity = parseInt(newQuantity);
        // UI 상의 수량 변경을 임시 상태에 저장
        setQuantityChanges({ ...quantityChanges, [cartItemId]: parsedQuantity > 0 ? parsedQuantity : 1 }); // 수량은 최소 1
    };

    const updateQuantities = () => {
        const promises = Object.entries(quantityChanges).map(([cartItemId, quantity]) => {
            return myAxios(token, setToken).put(`/cart/items/${cartItemId}`, { quantity });
        });

        Promise.all(promises)
            .then(() => {
                alert("수량이 수정되었습니다.");
                fetchCart(); // 장바구니 새로고침
            })
            .catch(err => {
                console.error("수량 수정 실패:", err);
                alert("수량 수정 중 오류가 발생했습니다.");
            });
    };

    const deleteSelected = () => {
        const idsToDelete = Array.from(checkedItems);
        if (idsToDelete.length === 0) {
            alert("삭제할 상품을 선택해주세요.");
            return;
        }
        myAxios(token, setToken).delete('/cart/items', { data: { cartItemIds: idsToDelete } }) // DELETE /api/cart/items
            .then(() => {
                alert("선택한 상품을 삭제했습니다.");
                fetchCart(); // 장바구니 새로고침
            })
            .catch(err => {
                console.error("상품 삭제 실패:", err);
                alert("상품 삭제에 실패했습니다.");
            });
    };

    const handleOrder = () => {
        const itemsToOrder = cart.items
            .filter(item => checkedItems.has(item.cartItemId))
            .map(item => ({
                cartItemId: item.cartItemId, // Order.jsx에서 사용하기 위해 추가
                productId: item.productId,
                productName: item.productName,
                price: item.price,
                imageUrl: item.imageUrl,
                quantity: quantityChanges[item.cartItemId] ?? item.quantity,
            }));

        if (itemsToOrder.length === 0) {
            alert("주문할 상품을 선택해주세요.");
            return;
        }

        const totalPrice = itemsToOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        navigate('/order', { state: { items: itemsToOrder, price: totalPrice, type: 'cart' } });
    };

    if (!token || !user.username) return <Container className='mt-4'><Alert color="warning">장바구니를 보려면 로그인이 필요합니다.</Alert></Container>;
    if (!cart) return <Container className='mt-4'><div>장바구니 정보를 불러오는 중입니다...</div></Container>;

    const compatibilityColor = { SUCCESS: 'success', WARN: 'warning', FAIL: 'danger', EMPTY: 'info' }[cart.compatibilityStatus || 'EMPTY'];

    return (
        <Container className='mt-4'>
            <h2 className='mb-4'>가상 견적 (장바구니)</h2>
            <Alert color={compatibilityColor}>
                <h4 className='alert-heading'>{cart.compatibilityStatus}</h4>
                {cart.compatibilityReasonCode}
            </Alert>
            <Table>
                <thead>
                    <tr><th><Input type="checkbox" checked={cart.items.length > 0 && checkedItems.size === cart.items.length} onChange={() => {}} /></th><th colSpan="2">상품정보</th><th>판매가</th><th>수량</th><th>합계</th></tr>
                </thead>
                <tbody>
                    {cart.items.map(item => ( // api.md: cartItems -> items
                        <tr key={item.cartItemId}>
                            <td><Input type="checkbox" checked={checkedItems.has(item.cartItemId)} onChange={() => handleCheckChange(item.cartItemId)} /></td>
                            <td><img src={`${imageUrl}${item.imageUrl}`} alt={item.productName} style={{ width: '100px', height: '100px' }} /></td>
                            <td>{item.productName}</td>
                            <td>${item.price.toLocaleString()}</td>
                            {/* 임시 수량 상태(quantityChanges) 또는 원래 수량(item.quantity)을 표시 */}
                            <td><Input type="number" value={quantityChanges[item.cartItemId] ?? item.quantity} onChange={(e) => handleQuantityChange(item.cartItemId, e.target.value)} style={{ width: '80px' }} min="1" /></td>
                            <td>${(item.price * (quantityChanges[item.cartItemId] ?? item.quantity)).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Row className='mt-4 align-items-center'>
                <Col>
                    <Button color="danger" onClick={deleteSelected}>선택 삭제</Button>{' '}
                    <Button color="secondary" onClick={updateQuantities}>수량 수정</Button>
                </Col>
                <Col className='text-end'>
                    <h3>총 견적 금액: <span className='text-primary fw-bold'>${cart.totalPrice?.toLocaleString()}</span></h3>
                    <Button color="primary" size="lg" onClick={handleOrder}>선택 상품 주문하기</Button>
                </Col>
            </Row>
        </Container>
    );
}