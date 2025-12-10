import { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Input, Pagination, PaginationItem } from 'reactstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function SellerOrderManagement() {
    const [orders, setOrders] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editData, setEditData] = useState({}); // { orderItemId: { status, shippingCompany, trackingNumber } }

    // 택배사 목록 정의
    const SHIPPING_COMPANIES = {
        'CJ_LOGISTICS': 'CJ대한통운',
        'LOTTE': '롯데택배',
        'HANJIN': '한진택배',
        'POST_OFFICE': '우체국택배'
    };

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const [searchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    const fetchOrders = () => {
        setLoading(true);
        myAxios(token, setToken).get('/seller/orders', { params: { page, size: 10 } })
            .then(res => {
                setOrders(res.data.content);
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
                // 초기 수정 데이터 세팅
                const initialEditData = {};
                res.data.content.forEach(order => {
                    const trackingInfo = order.trackingNumber ? order.trackingNumber.split(',') : ['CJ_LOGISTICS', ''];
                    const shippingCompany = trackingInfo[0] || 'CJ_LOGISTICS';
                    const trackingNumberValue = trackingInfo[1] || '';

                    initialEditData[order.orderItemId] = {
                        status: order.status,
                        shippingCompany: shippingCompany,
                        trackingNumber: trackingNumberValue
                    };
                });
                setEditData(initialEditData);
            })
            .catch(err => {
                console.error("판매 주문 조회 실패:", err);
                setError("주문 목록을 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (token) fetchOrders();
    }, [token, setToken, page]);

    const handleInputChange = (orderItemId, field, value) => {
        setEditData(prev => ({
            ...prev,
            [orderItemId]: { ...prev[orderItemId], [field]: value }
        }));
    };

    const handleUpdate = (orderItemId) => {
        const currentEditData = editData[orderItemId];
        if (!currentEditData) return;

        // 택배사와 송장번호를 합쳐서 전송할 데이터 생성
        const payload = {
            status: currentEditData.status,
            trackingNumber: `${currentEditData.shippingCompany},${currentEditData.trackingNumber}`
        };

        myAxios(token, setToken).put(`/seller/orders/${orderItemId}`, payload)
            .then(() => {
                alert("주문 상태가 업데이트되었습니다.");
                fetchOrders(); // 목록 새로고침
            })
            .catch(err => {
                alert(err.response?.data?.message || "업데이트 중 오류가 발생했습니다.");
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
                    <Link to={`/seller/orders?page=${Math.max(0, currentPage - pageRangeDisplayed)}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === pageInfo.number}>
                    <Link to={`/seller/orders?page=${i}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group">
                    <Link to={`/seller/orders?page=${Math.min(totalPages - 1, currentPage + pageRangeDisplayed)}`} className="page-link">»</Link>
                </PaginationItem>
            );
        }

        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/seller-center" color="secondary" outline className='mb-4'>&laquo; 판매자 센터로 돌아가기</Button>
            <h2 className='page-title'>주문/배송 관리</h2>
            {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                <Table striped responsive>
                    <thead>
                        <tr>
                            <th>주문번호</th>
                            <th>상품명</th>
                            <th>수량</th>
                            <th>주문자</th>
                            <th>배송 상태</th>
                            <th>택배사</th>
                            <th>송장 번호</th>
                            <th>처리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length > 0 ? orders.map(order => (
                            <tr key={order.orderItemId}>
                                <td>{order.orderId}</td>
                                <td>{order.productName}</td>
                                <td>{order.quantity}</td>
                                <td>{order.recipientName}</td>
                                <td>
                                    <Input type="select" bsSize="sm" value={editData[order.orderItemId]?.status} onChange={(e) => handleInputChange(order.orderItemId, 'status', e.target.value)}>
                                        <option value="PAID">결제완료</option>
                                        <option value="PREPARING">배송준비중</option>
                                        <option value="SHIPPED">배송중</option>
                                        <option value="DELIVERED">배송완료</option>
                                    </Input>
                                </td>
                                <td>
                                    <Input type="select" bsSize="sm" value={editData[order.orderItemId]?.shippingCompany} onChange={(e) => handleInputChange(order.orderItemId, 'shippingCompany', e.target.value)}>
                                        {Object.entries(SHIPPING_COMPANIES).map(([key, name]) => (
                                            <option key={key} value={key}>{name}</option>
                                        ))}
                                    </Input>
                                </td>
                                <td><Input type="text" bsSize="sm" value={editData[order.orderItemId]?.trackingNumber} onChange={(e) => handleInputChange(order.orderItemId, 'trackingNumber', e.target.value)} /></td>
                                <td><Button color="primary" size="sm" onClick={() => handleUpdate(order.orderItemId)}>저장</Button></td>
                            </tr>
                        )) : <tr><td colSpan="8" className="text-center">새로운 주문이 없습니다.</td></tr>}
                    </tbody>
                </Table>
            )}
            <div className="d-flex justify-content-center mt-4">{renderPagination()}</div>
        </Container>
    );
}