import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Pagination, PaginationItem } from 'reactstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminDashboard() {
    const [requests, setRequests] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [stats, setStats] = useState({ orderCount: 0, userCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const [searchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    const fetchSellerRequests = () => {
        setLoading(true);
        myAxios(token, setToken).get('/admin/seller-requests', { params: { page, size: 5 } })
            .then(res => {
                setRequests(res.data.content);
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
            })
            .catch(err => {
                console.error("판매자 가입 요청 조회 실패:", err);
                setError("데이터를 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    };

    const fetchStats = () => {
        const orderCountPromise = myAxios(token, setToken).get('/admin/ordercounts');
        const userCountPromise = myAxios(token, setToken).get('/admin/usercounts');

        Promise.all([orderCountPromise, userCountPromise])
            .then(([orderRes, userRes]) => {
                setStats({
                    orderCount: orderRes.data,
                    userCount: userRes.data
                });
            })
            .catch(err => console.error("통계 조회 실패:", err));
    };

    useEffect(() => {
        fetchSellerRequests();
        fetchStats();
    }, [token, setToken, page]);

    const handleApprove = (userId) => {
        if (!window.confirm("이 판매자의 가입을 승인하시겠습니까?")) return;

        myAxios(token, setToken).put(`/admin/seller-requests/${userId}/approve`)
            .then(() => {
                alert("가입이 승인되었습니다.");
                fetchSellerRequests(); // 목록 새로고침
            })
            .catch(err => {
                alert(err.response?.data?.message || "승인 처리 중 오류가 발생했습니다.");
            });
    };

    const handleReject = (userId) => {
        if (!window.confirm("이 판매자의 가입을 거절하시겠습니까?")) return;

        myAxios(token, setToken).put(`/admin/seller-requests/${userId}/suspended`)
            .then(() => {
                alert("가입이 거절되었습니다.");
                fetchSellerRequests(); // 목록 새로고침
            })
            .catch(err => {
                alert(err.response?.data?.message || "거절 처리 중 오류가 발생했습니다.");
            });
    };

    const renderPagination = () => {
        if (!pageInfo.totalPages) return null;

        const currentPage = pageInfo.number;
        const totalPages = pageInfo.totalPages;
        const pageRangeDisplayed = 10;
        let startPage = Math.max(0, currentPage - Math.floor(pageRangeDisplayed / 2));
        let endPage = Math.min(totalPages, startPage + pageRangeDisplayed);

        if (endPage - startPage < pageRangeDisplayed) {
            startPage = Math.max(0, endPage - pageRangeDisplayed);
        }

        const items = [];

        // 이전 페이지 그룹
        if (currentPage > 0) {
            items.push(
                <PaginationItem key="prev-group">
                    <Link to={`/admin?page=${Math.max(0, currentPage - pageRangeDisplayed)}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === currentPage}>
                    <Link to={`/admin?page=${i}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group"><Link to={`/admin?page=${Math.min(totalPages - 1, currentPage + pageRangeDisplayed)}`} className="page-link">»</Link></PaginationItem>
            );
        }
        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <h2 className='page-title'>관리자 대시보드</h2>
            
            <section id="admin-nav" className='my-4'>
                <Row>
                    <Col md="3">
                        <Button tag={Link} to="/admin/users" color="secondary" block>회원 관리</Button>
                    </Col>
                    <Col md="3">
                        <Button tag={Link} to="/admin/parts" color="secondary" block>기반 모델 관리</Button>
                    </Col>
                    <Col md="3">
                        <Button tag={Link} to="/admin/requests" color="secondary" block>모델 등록 요청</Button>
                    </Col>
                    <Col md="3">
                        <Button tag={Link} to="/admin/scheduler" color="secondary" block>스케줄러 관리</Button>
                    </Col>
                </Row>
            </section>
            
            <section id="site-stats" className='my-5'>
                <h3>사이트 현황</h3>
                <Row>
                    <Col md="6">
                        <Card body className='text-center'>
                            <h4>총 회원 수</h4>
                            <p className='fs-2 fw-bold'>{stats.userCount.toLocaleString()}</p>
                        </Card>
                    </Col>
                    <Col md="6">
                        <Card body className='text-center'>
                            <h4>총 주문 수</h4>
                            <p className='fs-2 fw-bold'>{stats.orderCount.toLocaleString()}</p>
                        </Card>
                    </Col>
                </Row>
            </section>

            <section id="seller-applications" className='mt-5'>
                <h3>판매자 가입 요청 (SELLER_PENDING)</h3>
                {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                    <Table striped>
                        <thead>
                            <tr>
                                <th>신청일</th>
                                <th>상호명</th>
                                <th>사업자번호</th>
                                <th>처리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? requests.map(req => (
                                <tr key={req.userId}>
                                    <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                                    <td>{req.companyName}</td>
                                    <td>{req.companyNumber}</td>
                                    <td>
                                        <Button color="success" size="sm" className='me-2' onClick={() => handleApprove(req.userId)}>승인</Button>
                                        <Button color="danger" size="sm" onClick={() => handleReject(req.userId)}>거절</Button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="4" className="text-center">새로운 가입 요청이 없습니다.</td></tr>}
                        </tbody>
                    </Table>
                )}
                {pageInfo.totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">{renderPagination()}</div>
                )}
            </section>
        </Container>
    );
}