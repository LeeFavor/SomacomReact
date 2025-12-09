import { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Pagination, PaginationItem } from 'reactstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminBaseSpecRequestList() {
    const [requests, setRequests] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const [searchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    useEffect(() => {
        setLoading(true);
        myAxios(token, setToken).get('/admin/base-spec-requests', { params: { page, size: 10 } })
            .then(res => {
                setRequests(res.data.content); // Assuming paged response
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
            })
            .catch(err => {
                console.error("모델 등록 요청 조회 실패:", err);
                setError("데이터를 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    }, [token, setToken, page]);

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
                    <Link to={`/admin/requests?page=${Math.max(0, currentPage - pageRangeDisplayed)}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === currentPage}>
                    <Link to={`/admin/requests?page=${i}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group">
                    <Link to={`/admin/requests?page=${Math.min(totalPages - 1, currentPage + pageRangeDisplayed)}`} className="page-link">»</Link>
                </PaginationItem>
            );
        }
        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin" color="secondary" outline className='mb-4'>&laquo; 대시보드로 돌아가기</Button>
            <h2 className='page-title'>기반 모델 등록 요청 처리 (A-203)</h2>

            <section id="model-request-list" className='mt-4'>
                <h3>판매자 요청 목록 (PENDING)</h3>
                {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                    <Table striped>
                        <thead>
                            <tr><th>요청자 (Seller)</th><th>요청 모델명</th><th>카테고리</th><th>처리</th></tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? requests.map(req => (
                                <tr key={req.requestId}>
                                    <td>{req.sellerName}</td>
                                    <td>{req.requestedModelName}</td>
                                    <td>{req.category}</td>
                                    <td><Button tag={Link} to={`/admin/parts/new?modelName=${req.requestedModelName}&category=${req.category}`} color="primary" size="sm">검토 및 등록</Button></td>
                                </tr>
                            )) : <tr><td colSpan="4" className="text-center">새로운 모델 등록 요청이 없습니다.</td></tr>}
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