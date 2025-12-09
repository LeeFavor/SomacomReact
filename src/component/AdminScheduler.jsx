import { Container, Row, Col, Card, CardBody, CardTitle, CardText, Button, CardHeader } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminScheduler() {
    const navigate = useNavigate(); // [수정] useNavigate 훅 선언
    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    const handleRunScheduler = (schedulerName) => {
        const endpointMap = {
            'compatibility': '/admin/batch/compatibility',
            'popularity': '/admin/batch/popularity',
            'syncCatalog': '/admin/sync/catalog' // [신규] AI 카탈로그 동기화 엔드포인트
        };

        const endpoint = endpointMap[schedulerName];
        if (!endpoint) return;

        if (!window.confirm(`'${schedulerName}' 스케줄러를 수동으로 실행하시겠습니까?`)) return;

        myAxios(token, setToken).post(endpoint)
            .then(res => {
                alert(`'${schedulerName}' 스케줄러 실행이 성공적으로 요청되었습니다.`);
                navigate('/admin/logs'); // [신규] 로그 페이지로 이동
            })
            .catch(err => alert(err.response?.data?.message || "스케줄러 실행 요청에 실패했습니다."));
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin" color="secondary" outline className='mb-4'>&laquo; 대시보드로 돌아가기</Button>
            <h2 className='page-title'>스케줄러 관리 (A-301)</h2>
            <p>자동화된 배치 작업을 모니터링하고, 필요 시 수동으로 실행합니다.</p>

            <Row className='mt-4'>
                <Col md="4"> {/* md=6 -> md=4 변경 */}
                    <Card className="h-100">
                        <CardHeader tag="h4">SYS-101 (호환성 엔진)</CardHeader>
                        <CardBody className="d-flex flex-column">
                            <CardText className="flex-grow-1">
                                마지막 실행: 2025-11-07 03:00 / 상태: <span style={{ color: '#10b981' }}>성공</span>
                            </CardText>
                            <Button color="info" onClick={() => handleRunScheduler('compatibility')}>SYS-101 수동 실행</Button>
                        </CardBody>
                    </Card>
                </Col>
                <Col md="4"> {/* md=6 -> md=4 변경 */}
                    <Card className="h-100">
                        <CardHeader tag="h4">SYS-102 (인기도 엔진)</CardHeader>
                        <CardBody className="d-flex flex-column">
                            <CardText className="flex-grow-1">
                                마지막 실행: 2025-11-07 04:00 / 상태: <span style={{ color: '#10b981' }}>성공</span>
                            </CardText>
                            <Button color="info" onClick={() => handleRunScheduler('popularity')}>SYS-102 수동 실행</Button>
                        </CardBody>
                    </Card>
                </Col>
                {/* [신규] AI 카탈로그 동기화 카드 */}
                <Col md="4">
                    <Card className="h-100">
                        <CardHeader tag="h4">SYS-103 (AI 카탈로그 동기화)</CardHeader>
                        <CardBody className="d-flex flex-column">
                            <CardText className="flex-grow-1">
                                로컬 DB의 모든 BaseSpec 데이터를 Google Cloud Retail AI의 카탈로그와 동기화합니다.
                            </CardText>
                            <Button color="info" onClick={() => handleRunScheduler('syncCatalog')}>AI 카탈로그 동기화</Button>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            <Row className='mt-4'>
                <Col>
                    <Card>
                        <CardHeader tag="h4">엔진 로그 (A-301.3)</CardHeader>
                        <CardBody>
                            <CardText>배치 작업 및 AI API 연동(SYS-103) 로그를 확인합니다.</CardText>
                            <Button tag={Link} to="/admin/logs" color="secondary">로그 뷰어로 이동</Button>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}