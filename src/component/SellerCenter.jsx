import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Pagination, PaginationItem } from 'reactstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function SellerCenter() {
    const [products, setProducts] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    const fetchMyProducts = () => {
        setLoading(true);
        myAxios(token, setToken).get('/seller/products', { params: { page, size: 10 } })
            .then(res => {
                setProducts(res.data.content);
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
            })
            .catch(err => {
                console.error("내 판매 상품 조회 실패:", err);
                setError("상품 목록을 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (token) {
            fetchMyProducts();
        }
    }, [token, setToken, page]);

    const handleDelete = (productId) => {
        if (!window.confirm(`정말로 이 상품(ID: ${productId})을 삭제하시겠습니까?`)) return;

        myAxios(token, setToken).delete(`/seller/products/${productId}`)
            .then(() => {
                alert("상품이 삭제되었습니다.");
                fetchMyProducts(); // 목록 새로고침
            })
            .catch(err => {
                alert(err.response?.data?.message || "상품 삭제 중 오류가 발생했습니다.");
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
                    <Link to={`/seller-center?page=${Math.max(0, currentPage - pageRangeDisplayed)}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === pageInfo.number}>
                    <Link to={`/seller-center?page=${i}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group">
                    <Link to={`/seller-center?page=${Math.min(totalPages - 1, currentPage + pageRangeDisplayed)}`} className="page-link">»</Link>
                </PaginationItem>
            );
        }

        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <h2 className='page-title'>판매자 센터</h2>

            <section id="seller-nav" className='my-4'>
                <Row>
                    <Col md="6">
                        <Button tag={Link} to="/seller/orders" color="info" block>주문/배송 관리</Button>
                    </Col>
                    <Col md="6">
                        <Button tag={Link} to="/seller/products/new" color="success" block>+ 신규 판매 상품 등록</Button>
                    </Col>
                </Row>
            </section>

            <section id="seller-product-management" className='mt-5'>
                <h3>내 판매 상품 목록</h3>
                {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                    <Table striped responsive>
                        <thead>
                            <tr>
                                <th>상품 ID</th>
                                <th>기반모델명</th>
                                <th>상품명</th>
                                <th>가격</th>
                                <th>재고</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? products.map(p => (
                                <tr key={p.productId}>
                                    <td>{p.productId}</td>
                                    <td>{p.baseSpecName}</td>
                                    <td>{p.productName}</td>
                                    <td>${p.price.toLocaleString()}</td>
                                    <td>{p.stockQuantity}</td>
                                    <td>
                                        <Button color="warning" size="sm" className='me-2' onClick={() => navigate(`/seller/products/edit/${p.productId}`)}>수정</Button>
                                        <Button color="danger" size="sm" onClick={() => handleDelete(p.productId)}>삭제</Button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="6" className="text-center">등록된 상품이 없습니다.</td></tr>}
                        </tbody>
                    </Table>
                )}
                <div className="d-flex justify-content-center mt-4">
                    {renderPagination()}
                </div>
            </section>
        </Container>
    );
}