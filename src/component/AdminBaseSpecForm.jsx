import { useState, useEffect } from 'react';
import { Container, Form, FormGroup, Label, Input, Button, Spinner, Alert, Row, Col, Card, CardBody } from 'reactstrap';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

// 각 카테고리별 상세 사양 폼 컴포넌트
const CpuSpecForm = ({ spec, handleChange }) => (
    <Card body color="light" className='mt-3'>
        <FormGroup>
            <Label for="socket">소켓 (Socket) *</Label> 
            <Input type="text" name="socket" id="socket" value={spec.socket ?? ''} onChange={handleChange} required />
        </FormGroup>
        <FormGroup>
            <Label>지원 메모리 타입 *</Label>
            <Input type="text" name="supportedMemoryTypes" id="supportedMemoryTypes" value={Array.isArray(spec.supportedMemoryTypes) ? spec.supportedMemoryTypes.join(', ') : (spec.supportedMemoryTypes ?? '')} onChange={handleChange} placeholder="콤마(,)로 구분하여 입력 (예: DDR5, DDR4)" required />
        </FormGroup>
        <FormGroup check>
            <Label check><Input type="checkbox" name="hasIgpu" checked={spec.hasIgpu || false} onChange={handleChange} /> 내장 그래픽(iGPU) 포함</Label>
        </FormGroup>
    </Card>
);

const MotherboardSpecForm = ({ spec, handleChange }) => (
    <Card body color="light" className='mt-3'>
        <Row>
            <Col md={6}><FormGroup><Label for="socket">소켓 (Socket) *</Label><Input type="text" name="socket" id="socket" value={spec.socket ?? ''} onChange={handleChange} placeholder="예: AM5" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="chipset">칩셋 (Chipset) *</Label><Input type="text" name="chipset" id="chipset" value={spec.chipset ?? ''} onChange={handleChange} placeholder="예: B650" required /></FormGroup></Col>
        </Row>
        <Row>
            <Col md={6}><FormGroup><Label for="memoryType">메모리 타입 *</Label><Input type="text" name="memoryType" id="memoryType" value={spec.memoryType ?? ''} onChange={handleChange} placeholder="예: DDR5" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="memorySlots">메모리 슬롯 수 *</Label><Input type="number" name="memorySlots" id="memorySlots" value={spec.memorySlots ?? ''} onChange={handleChange} placeholder="예: 4" required /></FormGroup></Col>
        </Row>
        <Row>
            <Col md={4}><FormGroup><Label for="formFactor">폼팩터</Label><Input type="text" name="formFactor" id="formFactor" value={spec.formFactor ?? ''} onChange={handleChange} placeholder="예: EATX" /></FormGroup></Col>
            <Col md={4}><FormGroup><Label for="pcieVersion">PCIe 버전</Label><Input type="number" name="pcieVersion" id="pcieVersion" step="0.1" value={spec.pcieVersion ?? ''} onChange={handleChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label for="pcieLanes">PCIe 레인</Label><Input type="number" name="pcieLanes" id="pcieLanes" value={spec.pcieLanes ?? ''} onChange={handleChange} /></FormGroup></Col>
        </Row>
    </Card>
);

const RamSpecForm = ({ spec, handleChange }) => (
    <Card body color="light" className='mt-3'>
        <Row>
            <Col md={6}><FormGroup><Label for="memoryType">메모리 타입 *</Label><Input type="text" name="memoryType" id="memoryType" value={spec.memoryType || ''} onChange={handleChange} placeholder="예: DDR5" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="speedMhz">동작 속도 (MHz) *</Label><Input type="number" name="speedMhz" id="speedMhz" value={spec.speedMhz ?? ''} onChange={handleChange} placeholder="예: 5200" required /></FormGroup></Col>
        </Row>
        <Row>
            <Col md={6}><FormGroup><Label for="capacityGb">모듈 1개당 용량 (GB) *</Label><Input type="number" name="capacityGb" id="capacityGb" value={spec.capacityGb ?? ''} onChange={handleChange} placeholder="예: 16" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="kitQuantity">킷(Kit) 수량 *</Label><Input type="number" name="kitQuantity" id="kitQuantity" value={spec.kitQuantity ?? ''} onChange={handleChange} required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="heightMm">모듈 높이 (mm)</Label><Input type="number" name="heightMm" id="heightMm" value={spec.heightMm ?? ''} onChange={handleChange} /></FormGroup></Col>
        </Row>
    </Card>
);

const GpuSpecForm = ({ spec, handleChange }) => (
    <Card body color="light" className='mt-3'>
        <Row>
            <Col md={6}><FormGroup><Label for="pcieVersion">PCIe 버전 *</Label><Input type="number" name="pcieVersion" id="pcieVersion" step="0.1" value={spec.pcieVersion ?? ''} onChange={handleChange} placeholder="예: 4.0" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="pcieLanes">PCIe 레인 *</Label><Input type="number" name="pcieLanes" id="pcieLanes" value={spec.pcieLanes ?? ''} onChange={handleChange} placeholder="예: 16" required /></FormGroup></Col>
            <Col md={6}><FormGroup><Label for="lengthMm">카드 길이 (mm)</Label><Input type="number" name="lengthMm" id="lengthMm" value={spec.lengthMm ?? ''} onChange={handleChange} /></FormGroup></Col>
        </Row>
    </Card>
);

const specForms = {
    CPU: CpuSpecForm,
    Motherboard: MotherboardSpecForm,
    RAM: RamSpecForm,
    GPU: GpuSpecForm,
};

export default function AdminBaseSpecForm() {
    const { baseSpecId } = useParams();
    const [searchParams] = useSearchParams();
    const isEditMode = !!baseSpecId;
    const navigate = useNavigate();

    const [baseInfo, setBaseInfo] = useState({ name: '', manufacturer: '', category: '' });
    const [specDetails, setSpecDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [requestId, setRequestId] = useState(null);


    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    useEffect(() => {
        // 수정 모드일 때 기존 데이터 로드
        if (isEditMode) {
            setLoading(true);
            myAxios(token, setToken).get(`/admin/parts/${baseSpecId}`)
                .then(res => {
                    const { name, manufacturer, category, ...details } = res.data;
                    setBaseInfo({ name, manufacturer, category });
                    console.log("API 응답 데이터에서 추출된 details:", details);
                    // cpuSpec, ramSpec 등을 specDetails 상태로 통합
                    const specKey = Object.keys(details).find(k => k.endsWith('Spec') && details[k] !== null);
                    console.log("찾은 specKey:", specKey);
                    console.log("specKey로 찾은 상세 스펙 객체:", details[specKey]);
                    setSpecDetails(details[specKey] || {});
                })
                .catch(err => setError("기반 모델 정보를 불러오는 데 실패했습니다."))
                .finally(() => setLoading(false));
        } else {
            // 등록 모드일 때, URL 파라미터로 초기값 설정 (모델 등록 요청 처리)
            const modelName = searchParams.get('modelName');
            const category = searchParams.get('category');
            const manufacturer = searchParams.get('manufacturer');
            const reqId = searchParams.get('requestId');
            if (manufacturer) setBaseInfo(prev => ({ ...prev, manufacturer: manufacturer }));
            if (modelName) setBaseInfo(prev => ({ ...prev, name: modelName }));
            if (category) setBaseInfo(prev => ({ ...prev, category: category }));
            if (reqId){
                // setBaseInfo(prev => ({ ...prev, requestId: reqId }));
                setRequestId(reqId);
            } 
            
        }
 
        
    }, [baseSpecId, isEditMode, searchParams, token, setToken]);

    const handleBaseInfoChange = (e) => {
        const { name, value } = e.target;
        setBaseInfo(prev => ({ ...prev, [name]: value }));
        // 카테고리 변경 시 상세 사양 초기화
        if (name === 'category') {
            setSpecDetails({});
        }
    };

    const handleSpecDetailsChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // 다중 선택 체크박스 처리 (e.g., supportedMemoryTypes)
            // if (name === 'supportedMemoryTypes') {
            //     const currentValues = specDetails.supportedMemoryTypes || [];
            //     const newValues = checked
            //         ? [...currentValues, value]
            //         : currentValues.filter(v => v !== value);
            //     setSpecDetails(prev => ({ ...prev, [name]: newValues }));
            // } else { // 단일 선택 체크박스
            if (name === 'hasIgpu') {
                setSpecDetails(prev => ({ ...prev, [name]: checked }));
            }
        } else {
            setSpecDetails(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const specDetailsToSend = { ...specDetails };
        // supportedMemoryTypes를 배열로 변환
        if (typeof specDetailsToSend.supportedMemoryTypes === 'string') {
            specDetailsToSend.supportedMemoryTypes = specDetailsToSend.supportedMemoryTypes.split(',').map(s => s.trim()).filter(Boolean);
        }

        // API 명세에 맞는 요청 본문 생성
        const requestBody = {
            ...baseInfo,
            [`${baseInfo.category.toLowerCase()}Spec`]: specDetailsToSend
        };

        const apiCall = isEditMode
            ? myAxios(token, setToken).put(`/admin/parts/${baseSpecId}`, requestBody)
            : myAxios(token, setToken).post('/admin/parts', requestBody);

        apiCall.then(() => {
            alert(`기반 모델이 성공적으로 ${isEditMode ? '수정' : '등록'}되었습니다.`);
            // 판매자 요청을 통해 등록된 경우, 해당 요청을 '승인' 처리
            if (requestId) {
                myAxios(token, setToken).put(`/admin/base-spec-requests/${requestId}`, { status: 'APPROVED', adminNotes: '등록 완료' })
                    .then(() => {
                        console.log(`Request ID ${requestId} has been approved.`);
                        // 요청 목록 페이지로 리디렉션
                        setTimeout(() => navigate('/admin/requests'), 2000);
                    })
                    .catch(err => {
                        console.error(`Failed to approve request ID ${requestId}:`, err);
                        // 실패하더라도 기반 모델 목록 페이지로는 이동
                        setTimeout(() => navigate('/admin/parts'), 2000);
                    });
            } else {
                setTimeout(() => navigate('/admin/parts'), 2000);
            }
        }).catch(err => {
            alert(err.response?.data?.message || "처리 중 오류가 발생했습니다.");
        });
    };

    const SpecFormComponent = specForms[baseInfo.category];

    if (loading) return <Container className='mt-4'><Spinner /></Container>;

    // 렌더링 직전에 상세 사양 상태를 콘솔에 출력하여 확인합니다.
    // console.log("상세 정보 렌더링 직전:", specDetails);

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin/parts" color="secondary" outline className='mb-4'>&laquo; 기반 모델 목록으로</Button>
            <h2 className='page-title'>{isEditMode ? '기반 모델 수정' : '신규 기반 모델 등록'}</h2>
            {error && <Alert color="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Card body className='mb-4'>
                    <CardBody>
                        <h3 className='mb-3'>1. 기본 정보</h3>
                        <FormGroup>
                            <Label for="category">모델 타입 *</Label>
                            <Input type="select" name="category" id="category" value={baseInfo.category} onChange={handleBaseInfoChange} required disabled={isEditMode}>
                                <option value="">-- 선택해주세요 --</option>
                                <option value="CPU">CPU (프로세서)</option>
                                <option value="Motherboard">Motherboard (메인보드)</option>
                                <option value="RAM">RAM (메모리)</option>
                                <option value="GPU">GPU (그래픽카드)</option>
                            </Input>
                        </FormGroup>
                        <Row>
                            <Col md={8}>
                                <FormGroup>
                                    <Label for="name">기반 모델명 *</Label>
                                    <Input type="text" name="name" id="name" value={baseInfo.name} onChange={handleBaseInfoChange} required />
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for="manufacturer">제조사 *</Label>
                                    <Input type="text" name="manufacturer" id="manufacturer" value={baseInfo.manufacturer} onChange={handleBaseInfoChange} required />
                                </FormGroup>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
                {/* 수정/등록 모드에 관계없이 SpecFormComponent가 존재할 때만 렌더링 */}
                {SpecFormComponent && (
                    <Card body>
                        <CardBody>
                            <h3 className='mb-3'>2. 상세 사양</h3>
                            <SpecFormComponent spec={specDetails} handleChange={handleSpecDetailsChange} />
                        </CardBody>
                    </Card>
                )}
                <Button type="submit" color="primary" block className='mt-4' style={{ padding: '15px', fontSize: '1.2em' }}>
                    {isEditMode ? '수정 완료' : '신규 등록'}
                </Button>
            </Form>
        </Container>
    );
}