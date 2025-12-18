import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Input, Table, Alert, CardImg, CardBody, CardTitle, CardSubtitle, CardText } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '../atoms';

// 상품 카드를 표시하는 재사용 가능한 컴포넌트
const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    return (
        <Col md="3" className="mb-4">
            <Card className='h-100' style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${product.productId}`)}>
                <CardImg top width="100%" src={`${imageUrl}${product.imageUrl}`} alt={product.productName} style={{ height: '200px', objectFit: 'cover' }} />
                <CardBody>
                    <CardTitle tag="h5" style={{ fontSize: '1rem', height: '40px' }}>{product.productName}</CardTitle>
                    <CardSubtitle tag="h6" className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>{product.companyName}</CardSubtitle>
                    <CardText className='fw-bold fs-5 text-primary'>${product.price?.toLocaleString()}</CardText>
                </CardBody>
            </Card>
        </Col>
    );
};

export default function Cart() {
    const [cart, setCart] = useState(null);
    const [checkedItems, setCheckedItems] = useState(new Set());
    const [recommendedProduct, setRecommendedProduct] = useState(null);
    const [adIndex, setAdIndex] = useState(-1); // 광고를 삽입할 위치
    const [compatibleProducts, setCompatibleProducts] = useState([]); // 호환 상품 목록
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
                const cartData = res.data;
                setCart(cartData);
                // 초기에 모든 아이템 선택
                if (cartData && cartData.items) { // api.md: cartItems -> items
                    const allItemIds = new Set(cartData.items.map(item => item.cartItemId));
                    setCheckedItems(allItemIds);
                }

                // 조건에 맞으면 AI 추천 광고 상품을 가져옵니다.
                if (cartData && cartData.items.length >= 2 && cartData.compatibilityStatus === 'SUCCESS') {
                    myAxios(token, setToken).get('/recommendations/personal', { params: { count: 1, eventType: 'shopping-cart-page-view' } })
                        .then(recRes => {
                            if (recRes.data && recRes.data.length > 0) {
                                setRecommendedProduct(recRes.data[0]);
                                // 1과 (아이템 개수 - 1) 사이의 랜덤 인덱스 생성
                                const randomIndex = Math.floor(Math.random() * (cartData.items.length - 1)) + 1;
                                setAdIndex(randomIndex);
                            }
                        })
                        .catch(err => console.error("AI 추천 상품 조회 실패:", err));
                }

                // 호환되는 상품 목록을 가져옵니다.
                if (cartData && cartData.items.length > 0) {
                    myAxios(token, setToken).get('/products/search', { params: { compatFilter: true, size: 31 } })
                        .then(compatRes => {
                            const allProducts = compatRes.data.content;
                            if (!allProducts || allProducts.length === 0) {
                                setCompatibleProducts([]);
                                return;
                            }

                            let finalProducts = [];
                            // API 응답에 baseSpecId가 없으므로, 중복 제거 로직을 생략하고 바로 allProducts를 사용합니다.
                            if (allProducts.length >= 31) {
                                // 1, 11, 21, 31번째 상품 선택
                                finalProducts = [0, 10, 20, 30].map(i => allProducts[i]).filter(Boolean);
                            } else {
                                // 0%, 33%, 67%, 100% 위치의 상품 선택
                                const len = allProducts.length;
                                const indices = new Set([0, Math.floor(len * 0.33), Math.floor(len * 0.67), len - 1]);
                                finalProducts = Array.from(indices).map(i => allProducts[i]).filter(Boolean);
                            }

                            setCompatibleProducts(finalProducts.slice(0, 4)); // 항상 최대 4개만 표시
                        })
                        .catch(err => {
                            console.error("호환 상품 조회 실패:", err);
                            setCompatibleProducts([]);
                        });
                } else {
                    setCompatibleProducts([]); // 장바구니가 비면 호환 상품 목록도 비웁니다.
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

    const handleCheckAll = () => {
        if (cart && cart.items.length > 0) {
            const allItemIds = new Set(cart.items.map(item => item.cartItemId));
            // 이미 모든 아이템이 선택되었다면, 전체 선택을 해제합니다.
            if (checkedItems.size === allItemIds.size) {
                setCheckedItems(new Set());
            } else { // 그렇지 않다면, 모든 아이템을 선택합니다.
                setCheckedItems(allItemIds);
            }
        }
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

    const addToCart = (productId) => {
        if (!token) {
            alert("로그인이 필요합니다.");
            return navigate('/login');
        }
        myAxios(token, setToken).post('/cart/items', { productId: parseInt(productId), quantity: 1 })
            .then(res => {
                alert("장바구니에 상품을 담았습니다.");
                fetchCart(); // 장바구니 새로고침
            })
            .catch(err => {
                console.error("장바구니 추가 실패:", err);
                alert(err.response?.data?.message || "장바구니 추가에 실패했습니다.");
            });
    };

    if (!token || !user.username) return <Container className='mt-4'><Alert color="warning">장바구니를 보려면 로그인이 필요합니다.</Alert></Container>;
    if (!cart) return <Container className='mt-4'><div>장바구니 정보를 불러오는 중입니다...</div></Container>;

    const compatibilityColor = { SUCCESS: 'success', WARN: 'warning', FAIL: 'danger', EMPTY: 'info' }[cart.compatibilityStatus || 'EMPTY'];

    return (
        <Container className='mt-4'>
            <h2 className='mb-4'>가상 견적 (장바구니)</h2>
            {cart.compatibilityStatus && (
                <Alert color={compatibilityColor}>
                    <h4 className='alert-heading'>{cart.compatibilityStatus}</h4>
                    {cart.compatibilityReasonCode}
                </Alert>
            )}
            <Table>
                <thead>
                    <tr><th><Input type="checkbox" checked={cart.items.length > 0 && checkedItems.size === cart.items.length} onChange={handleCheckAll} /></th><th colSpan="2">상품정보</th><th>판매가</th><th>수량</th><th>합계</th></tr>
                </thead>
                <tbody>
                    {cart.items.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="text-center p-5">장바구니에 담긴 상품이 없습니다.</td>
                        </tr>
                    ) : cart.items.map((item, index) => (
                        <>
                            <tr key={item.cartItemId}>
                                <td style={{ verticalAlign: 'middle' }}><Input type="checkbox" checked={checkedItems.has(item.cartItemId)} onChange={() => handleCheckChange(item.cartItemId)} /></td>
                                <td style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${item.productId}`)}><img src={`${imageUrl}${item.imageUrl}`} alt={item.productName} style={{ width: '100px', height: '100px', borderRadius: '6px' }} /></td>
                                <td style={{ cursor: 'pointer', verticalAlign: 'middle' }} onClick={() => navigate(`/products/${item.productId}`)}>{item.productName}</td>
                                <td>${item.price.toLocaleString()}</td>
                                <td><Input type="number" value={quantityChanges[item.cartItemId] ?? item.quantity} onChange={(e) => handleQuantityChange(item.cartItemId, e.target.value)} style={{ width: '80px' }} min="1" /></td>
                                <td>${(item.price * (quantityChanges[item.cartItemId] ?? item.quantity)).toLocaleString()}</td>
                            </tr>
                            {/* 광고 삽입 */}
                            {recommendedProduct && index === adIndex && (
                                <tr className="cart-ad-row" style={{ backgroundColor: '#fffbeb' }}>
                                    <td></td>
                                    <td colSpan="4" style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${recommendedProduct.product.productId}`)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <img src={`${imageUrl}${recommendedProduct.product.imageUrl}`} alt={recommendedProduct.product.productName} style={{ width: '80px', height: '80px', borderRadius: '6px' }} />
                                            <div>
                                                <h6 style={{ margin: 0, color: '#b45309' }}>✨ 이 견적과 호환되는 상품을 추천해드려요!</h6>
                                                <p style={{ margin: 0 }}>{recommendedProduct.product.productName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <Button color="primary" size="sm" block onClick={() => navigate(`/products/${recommendedProduct.product.productId}`)}>
                                            보러가기
                                        </Button>
                                        <Button color="secondary" size="sm" block className='mt-1' onClick={() => addToCart(recommendedProduct.product.productId)}>카트 담기</Button>
                                    </td>
                                </tr>
                            )}
                        </>
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

            {/* 호환되는 부품 추천 섹션 */}
            {compatibleProducts.length > 0 && (
                <section className='mt-5'>
                    <h3 className='mb-4' style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
                        🛒 현재 견적과 호환되는 상품
                    </h3>
                    <Row>
                        {compatibleProducts.map(p => <ProductCard key={p.productId} product={p} />)}
                    </Row>
                </section>
            )}
        </Container>
    );
}