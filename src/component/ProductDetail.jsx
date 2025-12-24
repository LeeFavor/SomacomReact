import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, CardImg, CardBody, Button, Input, Table, ListGroup, ListGroupItem, Modal, ModalBody, ModalHeader } from 'reactstrap';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';

// API 응답의 baseSpec 객체를 화면에 표시할 배열로 변환하는 함수
const formatSpecs = (baseSpec) => {
    if (!baseSpec) return [];
    const specs = [];
    if (baseSpec.manufacturer) specs.push({ name: '제조사', value: baseSpec.manufacturer });

    const specData = baseSpec.cpuSpec || baseSpec.gpuSpec || baseSpec.ramSpec || baseSpec.motherboardSpec;
    if (specData && Object.keys(specData).length > 0) { // specData가 존재하고 비어있지 않을 때만 처리
        for (const [key, value] of Object.entries(specData)) {
            // 간단한 변환 로직 (필요에 따라 확장)
            let name = key;
            if (key === 'socket') name = '소켓';
            else if (key === 'supportedMemoryTypes') name = '지원 메모리';
            else if (key === 'hasIgpu') name = '내장 그래픽';
            else if (key === 'pcieVersion') name = 'PCIe 버전';
            else if (key === 'pcieLanes') name = 'PCIe 레인';
            else if (key === 'chipset') name = '칩셋';
            else if (key === 'memoryType') name = '메모리 타입';
            else if (key === 'memorySlots') name = '메모리 슬롯';
            else if (key === 'speedMhz') name = '동작 속도 (MHz)';
            else if (key === 'capacityGb') name = '용량 (GB)';
            else if (key === 'kitQuantity') name = '킷 수량';
            
            specs.push({ name, value: Array.isArray(value) ? value.join(', ') : String(value) });
        }
    }
    return specs;
}

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [productData, setProductData] = useState(null); // API 응답을 구조화하여 저장할 상태
    const [recommendations, setRecommendations] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const token = useAtomValue(tokenAtom);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const longViewLogged = useRef(false); // 15초 체류 로그가 전송되었는지 추적
    const setToken = useSetAtom(tokenAtom);

    useEffect(() => {
        myAxios(token, setToken).get(`/products/${id}`)
            .then(res => {
                // 실제 API 응답(로그)이 api.md 명세와 다르게 평탄화되어 있으므로,
                // 컴포넌트 내부에서 사용할 구조화된 객체로 매핑합니다.
                const apiResponse = res.data;
                setProductData({
                    product: {
                        productId: apiResponse.productId,
                        productName: apiResponse.productName,
                        price: apiResponse.price,
                        imageUrl: apiResponse.imageUrl,
                        stock: apiResponse.stockQuantity,
                        description: apiResponse.description,
                        condition: apiResponse.condition,
                    },
                    sellerInfo: {
                        name: apiResponse.companyName,
                    },
                    baseSpec: {
                        baseSpecId: apiResponse.baseSpecId, // baseSpecId 추가
                        name: apiResponse.baseSpecName,
                        manufacturer: apiResponse.manufacturer,
                        cpuSpec: apiResponse.cpuSpec,
                        gpuSpec: apiResponse.gpuSpec,
                        ramSpec: apiResponse.ramSpec,
                        motherboardSpec: apiResponse.motherboardSpec,
                    },
                    priceComparison: apiResponse.priceComparisonList,
                });
            })
            .catch(err => {
                console.error("상품 상세 정보 조회 실패:", err);
                alert("상품 정보를 불러오는 데 실패했습니다.");
            });
        // 추천 상품 조회 (로그인 시)
        if (token) {
            myAxios(token, setToken).get('/recommendations/personal', { params: { count: 4, eventType: 'detail-page-view' } })
                .then(res => {
                    setRecommendations(res.data);
                })
                .catch(err => {
                    console.error("추천 상품 조회 실패:", err);
                });
        }
    }, [id, token, setToken]);

    // 15초 이상 체류 시 로그 전송
    useEffect(() => {
        if (!productData || !token || longViewLogged.current) return;

        const timer = setTimeout(() => {
            const baseSpecId = productData.baseSpec.baseSpecId;
            if (baseSpecId) {
                myAxios(token, setToken).post('/logs/action', {
                    baseSpecId: baseSpecId,
                    actionType: 'LONG_VIEW'
                }).catch(err => console.error("LONG_VIEW_COUNT 로그 전송 실패:", err));
                
                longViewLogged.current = true; // 로그가 한 번만 전송되도록 플래그 설정
            }
        }, 15000); // 15초

        // 컴포넌트 언마운트 시 타이머 정리
        return () => clearTimeout(timer);
    }, [productData, token, setToken]);

    const addToCart = async () => {
        if (!token) {
            alert("로그인이 필요합니다.");
            return navigate('/login'); // 로그인 페이지로 리다이렉트
        }
        myAxios(token, setToken).post('/cart/items', { productId: parseInt(id), quantity: parseInt(quantity) })
            .then(res => {
                if (window.confirm("장바구니에 상품을 담았습니다. 장바구니로 이동하시겠습니까?")) {
                    navigate('/cart');
                }
            })
            .catch(err => {
                console.error("장바구니 추가 실패:", err);
                alert("장바구니 추가에 실패했습니다.");
            });
    };

    const handleImageClick = () => {
        setIsImageModalOpen(true); // 모달 열기
        // 이미지 클릭 로그 전송
        const baseSpecId = productData.baseSpec.baseSpecId;
        if (token && baseSpecId) {
            myAxios(token, setToken).post('/logs/action', {
                baseSpecId: baseSpecId,
                actionType: 'IMAGE_VIEW'
            }).catch(err => console.error("IMAGE_VIEW_COUNT 로그 전송 실패:", err));
        }
    };

    if (!productData) {
        return <Container className='mt-4'><div>상품 정보를 불러오는 중입니다...</div></Container>;
    }
    
    const { product, sellerInfo, baseSpec, priceComparison } = productData;

    return (
        <Container className='mt-4'>
            <h2 className='mb-4'>상품 상세 정보</h2>
            <Row>
                <Col md="7" style={{ cursor: 'pointer' }} onClick={handleImageClick}>
                    <img src={`${imageUrl}${product.imageUrl}`} alt={product.productName} style={{ width: '100%', borderRadius: '8px' }} title="클릭해서 크게 보기" />
                    <h3 className='mt-4'>판매자 상품 상세 설명</h3>
                    <Card className='p-3'>{product.description}</Card>
                </Col>
                <Col md="5">
                    <h3>{product.productName}</h3>
                    <p>판매자: <strong>{sellerInfo.name}</strong></p>
                    <div className='fs-1 fw-bold my-3 text-primary'>${product.price.toLocaleString()}</div>
                    <Card body color="light" className='mb-3'>
                        <p><strong>재고:</strong> {product.stock}개</p>
                    </Card>
                    <Row className='align-items-center mb-3'>
                        <Col xs="auto"><label htmlFor="quantity">수량:</label></Col>
                        <Col xs="4">
                            <Input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" max={product.stock} />
                        </Col>
                    </Row>
                    <Button color="secondary" block className='mb-2' onClick={addToCart}>장바구니 담기</Button>
                    <Button color="primary" block onClick={() => {
                        if (!token) {
                            alert("로그인이 필요합니다.");
                            return navigate('/login');
                        }
                        const itemToOrder = {
                            productId: product.productId,
                            productName: product.productName,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            quantity: parseInt(quantity)
                        };
                        navigate('/order', { state: { items: [itemToOrder], price: itemToOrder.price * itemToOrder.quantity, type: 'instant' } });
                    }}>즉시 구매</Button>
                </Col>
            </Row>

            <hr className='my-5' />

            <section>
                <h3>[기반 모델] 상세 사양</h3>
                <Card body>
                    <h4>{baseSpec.name}</h4>
                    <ListGroup flush>
                        {formatSpecs(baseSpec).map(spec => (
                            <ListGroupItem key={spec.name}><strong>{spec.name}:</strong> {spec.value}</ListGroupItem>
                        ))}
                    </ListGroup>
                </Card>
            </section>

            <hr className='my-5' />

            <section>
                <h3>이 모델의 다른 판매자 상품 (가격 비교)</h3>
                <Table striped>
                    <thead>
                        <tr><th>판매자</th><th>상품명</th><th>상태</th><th>가격</th><th></th></tr>
                    </thead>
                    <tbody>
                        {priceComparison.map(item => (
                            <tr key={item.productId}>
                                <td>{item.sellerName}</td>
                                <td>{item.productName}</td>
                                <td>{item.condition}</td>
                                <td><strong>${item.price.toLocaleString()}</strong></td>
                                <td>
                                    {item.productId === product.productId ? '(현재 페이지)' : <Button size="sm" href={`/products/${item.productId}`}>보러가기</Button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </section>


            <section>
                {
                    recommendations.length > 0
                    &&(
                        <>
                    <hr className='my-5' />
                
                <h3>함께 구매된 추천 상품</h3>
                        </>
                )
                }
                <Row>
                    {recommendations.map(rec => (
                        <Col md="3" key={rec.product.productId}>
                            <Card>
                                <a href={`/products/${rec.product.productId}`} className='text-decoration-none text-dark' onClick={() => navigate(`/products/${rec.product.productId}`)}>
                                    <CardImg top src={`${imageUrl}${rec.product.imageUrl}`} alt={rec.product.productName} />
                                    <CardBody>
                                        <h5 style={{ fontSize: '1rem', height: '40px' }}>{rec.product.productName}</h5>
                                        <p className='text-muted'>{rec.product.companyName}</p>
                                        <p className='fw-bold text-primary'>${rec.product.price}</p>
                                    </CardBody>
                                </a>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </section>

            {/* 이미지 확대 모달 */}
            <Modal isOpen={isImageModalOpen} toggle={() => setIsImageModalOpen(false)} size="lg" centered>
                <ModalHeader toggle={() => setIsImageModalOpen(false)}>{product.productName}</ModalHeader>
                <ModalBody className="text-center"><img src={`${imageUrl}${product.imageUrl}`} alt={product.productName} style={{ maxWidth: '100%', maxHeight: '80vh' }} /></ModalBody>
            </Modal>
        </Container>
    );
}