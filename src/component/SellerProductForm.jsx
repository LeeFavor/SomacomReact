import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Form, FormGroup, Label, Input, Button, Spinner, Alert, Card, CardBody, ListGroup, ListGroupItem, Row, Col } from 'reactstrap';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { Link } from 'react-router-dom';
import { myAxios, imageUrl } from './config';

// ProductDetail.jsx에서 가져온 헬퍼 함수
const formatSpecs = (baseSpec) => {
    if (!baseSpec) return [];
    const specs = [];
    if (baseSpec.manufacturer) specs.push({ name: '제조사', value: baseSpec.manufacturer });

    const specData = baseSpec.cpuSpec || baseSpec.gpuSpec || baseSpec.ramSpec || baseSpec.motherboardSpec;
    if (specData && Object.keys(specData).length > 0) {
        for (const [key, value] of Object.entries(specData)) {
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

export default function SellerProductForm() {
    const { productId } = useParams(); // 수정 모드일 경우 productId가 존재
    const isEditMode = !!productId;
    const navigate = useNavigate();

    const [product, setProduct] = useState({
        baseSpecId: '',
        name: '',
        price: '',
        stockQuantity: '',
        imageUrl: '',
        description: '',
        condition: 'New'
    });
    const [baseSpecName, setBaseSpecName] = useState(''); // 화면 표시용
    const [baseSpecDetails, setBaseSpecDetails] = useState(null); // [신규] 기반 모델 상세 사양 저장
    const [baseSpecQuery, setBaseSpecQuery] = useState('');
    const [baseSpecSuggestions, setBaseSpecSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const searchContainerRef = useRef(null);
    const fileInputRef = useRef(null); // 파일 입력을 위한 ref

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    // 수정 모드일 때 기존 상품 정보 불러오기
    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            myAxios(token, setToken).get(`/seller/products/${productId}/edit`)
                .then(res => {
                    const data = res.data;
                    setProduct({
                        baseSpecId: data.baseSpecId, // baseSpecId도 상태에 저장
                        name: data.name,
                        price: data.price,
                        stockQuantity: data.stockQuantity,
                        imageUrl: data.imageUrl,
                        description: data.description || '',
                        condition: data.condition
                    });
                    setBaseSpecName(data.baseSpecName);
                    // [신규] 기반 모델 상세 사양 정보 저장
                    setBaseSpecDetails({
                        manufacturer: data.manufacturer,
                        cpuSpec: data.cpuSpec,
                        gpuSpec: data.gpuSpec,
                        ramSpec: data.ramSpec,
                        motherboardSpec: data.motherboardSpec,
                    });
                })
                .catch(err => setError("상품 정보를 불러오는 데 실패했습니다."))
                .finally(() => setLoading(false));
        }
    }, [isEditMode, productId, token, setToken]);

    // 기반 모델 검색 자동완성
    useEffect(() => {
        if (baseSpecQuery.length < 2) {
            setBaseSpecSuggestions([]);
            return;
        }
        const debounce = setTimeout(() => {
            myAxios(token, setToken).get('/seller/base-specs', { params: { query: baseSpecQuery } })
                .then(res => setBaseSpecSuggestions(res.data))
                .catch(err => console.error("기반 모델 검색 실패:", err));
        }, 300);
        return () => clearTimeout(debounce);
    }, [baseSpecQuery, token, setToken]);

    // 외부 클릭 시 자동완성 창 닫기
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchContainerRef]);

    const handleInputChange = (e) => {
        setProduct({ ...product, [e.target.name]: e.target.value });
    };

    const handleSuggestionClick = (spec) => {
        setProduct({ ...product, baseSpecId: spec.id });
        setBaseSpecName(spec.name);
        setBaseSpecQuery(spec.name);
        setShowSuggestions(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        myAxios(token, setToken).post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then(res => {
            // 업로드 성공 시 반환된 파일명으로 imageUrl 상태 업데이트
            setProduct(prev => ({ ...prev, imageUrl: res.data.fileName }));
        })
        .catch(err => {
            setError(err.response?.data?.message || "이미지 업로드에 실패했습니다.");
        })
        .finally(() => setLoading(false));
    };

    const triggerImageUpload = () => {
        fileInputRef.current.click();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isEditMode && !product.baseSpecId) {
            // console.log(product)
            alert("기반 모델을 검색하여 선택해주세요.");
            return;
        }

        setLoading(true);
        const apiCall = isEditMode
            ? myAxios(token, setToken).put(`/seller/products/${productId}`, product)
            : myAxios(token, setToken).post('/seller/products', product);

        apiCall.then(() => {
            alert(`상품이 성공적으로 ${isEditMode ? '수정' : '등록'}되었습니다.`);
            navigate('/seller-center');
        })
        .catch(err => {
            setError(err.response?.data?.message || `상품 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다.`);
        })
        .finally(() => setLoading(false));
    };

    if (loading) return <Container className='mt-4'><Spinner /></Container>;

    return (
        <Container className='mt-4' style={{ maxWidth: '800px' }}>
            <Button tag={Link} to="/seller-center" color="secondary" outline className='mb-4'>&laquo; 판매자 센터로 돌아가기</Button>
            <h2 className='page-title'>{isEditMode ? '판매 상품 수정' : '신규 판매 상품 등록'}</h2>
            {error && <Alert color="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Card body className='mb-4'>
                    <h4 className='mb-3'>1. 기반 모델</h4>
                    {isEditMode ? (
                        <div>
                            <p><strong>선택된 기반 모델:</strong> {baseSpecName} (변경 불가)</p>
                            {/* [신규] 기반 모델 상세 정보 표시 */}
                            {baseSpecDetails && (
                                <Card body color="light" className="mt-3">
                                    <h6 className='mb-2'>기반 모델 사양 (참고용)</h6>
                                    <ListGroup flush>
                                        {formatSpecs(baseSpecDetails).map(spec => (
                                            <ListGroupItem key={spec.name} className="px-0 py-1 bg-light"><strong>{spec.name}:</strong> {spec.value}</ListGroupItem>
                                        ))}
                                    </ListGroup>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div ref={searchContainerRef} style={{ position: 'relative' }}>
                            <Input type="search" value={baseSpecQuery} onChange={(e) => { setBaseSpecQuery(e.target.value); setShowSuggestions(true); }} placeholder="등록할 상품의 기반 모델 검색 (예: RTX 4070)" />
                            {showSuggestions && baseSpecSuggestions.length > 0 && (
                                <ListGroup style={{ position: 'absolute', top: '100%', width: '100%', zIndex: 1000 }}>
                                    {baseSpecSuggestions.map(spec => (
                                        <ListGroupItem key={spec.id} action tag="button" type="button" onClick={() => handleSuggestionClick(spec)}>
                                            {spec.name}
                                        </ListGroupItem>
                                    ))}
                                </ListGroup>
                            )}
                            <small className="form-text text-muted mt-2 d-block">
                                찾는 모델이 없나요? <Link to="/seller/base-spec-request">기반 모델 등록 요청</Link>
                            </small>
                        </div>
                    )}
                </Card>

                <Card body>
                    <h4 className='mb-3'>2. 판매 정보</h4>
                    <FormGroup>
                        <Label for="name">판매 상품명</Label>
                        <Input type="text" id="name" name="name" value={product.name} onChange={handleInputChange} required />
                    </FormGroup>
                    <Row>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="price">판매가 ($)</Label>
                                <Input type="number" id="price" name="price" value={product.price} onChange={handleInputChange} required />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="stockQuantity">재고</Label>
                                <Input type="number" id="stockQuantity" name="stockQuantity" value={product.stockQuantity} onChange={handleInputChange} required />
                            </FormGroup>
                        </Col>
                    </Row>
                    <FormGroup>
                        <Label for="condition">상품 상태</Label>
                        <Input type="select" id="condition" name="condition" value={product.condition} onChange={handleInputChange}>
                            <option value="New">신품 (New)</option>
                            <option value="Refurbished">리퍼비시 (Refurbished)</option>
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label for="imageUrl">상품 이미지</Label>
                        <div style={{ cursor: 'pointer', border: '2px dashed #ddd', borderRadius: '8px', padding: '10px', textAlign: 'center', minHeight: '200px' }} onClick={triggerImageUpload}>
                            {product.imageUrl ? (
                                <img src={`${imageUrl}${product.imageUrl}`} alt="상품 미리보기" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '180px' }}>
                                    <span style={{ fontSize: '3rem', color: '#ccc' }}>+</span>
                                    <p>클릭하여 이미지 업로드</p>
                                </div>
                            )}
                        </div>
                        <Input
                            type="file"
                            id="imageUpload"
                            innerRef={fileInputRef}
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="description">상세 설명</Label>
                        <Input type="textarea" id="description" name="description" value={product.description} onChange={handleInputChange} rows="5" />
                    </FormGroup>
                </Card>

                <Button type="submit" color="primary" block className='mt-4' style={{ padding: '15px', fontSize: '1.2em' }} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : (isEditMode ? '상품 정보 수정' : '판매 상품 등록')}
                </Button>
            </Form>
        </Container>
    );
}