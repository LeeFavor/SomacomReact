import { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Input, Form, Pagination, PaginationItem } from 'reactstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const [searchParams, setSearchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    const fetchUsers = () => {
        setLoading(true);
        myAxios(token, setToken).get('/admin/users', { params: { keyword: searchTerm, page, size: 10 } }) // api.md에 따라 keyword 파라미터 사용
            .then(res => {
                setUsers(res.data.content);
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
            })
            .catch(err => {
                console.error("회원 목록 조회 실패:", err);
                setError("회원 목록을 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [token, setToken, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        // 검색 시 첫 페이지로 이동
        setSearchParams({ keyword: searchTerm, page: 0 });
    };

    const handleStatusChange = (userId, status) => {
        const actionMap = {
            ACTIVE: '활성화',
            SUSPENDED: '일시 정지',
            DEACTIVATED: '영구 비활성'
        };
        const actionText = actionMap[status] || '상태로 변경';
        if (!window.confirm(`정말로 이 회원을 '${actionText}' 상태로 변경하시겠습니까?`)) return;

        myAxios(token, setToken).put(`/admin/users/${userId}/status`, { status })
            .then(() => {
                alert("회원 상태가 변경되었습니다.");
                fetchUsers(); // 목록 새로고침
            })
            .catch(err => {
                alert(err.response?.data?.message || "상태 변경 중 오류가 발생했습니다.");
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
                    <Link to={`/admin/users?page=${Math.max(0, currentPage - pageRangeDisplayed)}&keyword=${searchTerm}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === currentPage}>
                    <Link to={`/admin/users?page=${i}&keyword=${searchTerm}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group"><Link to={`/admin/users?page=${Math.min(totalPages - 1, currentPage + pageRangeDisplayed)}&keyword=${searchTerm}`} className="page-link">»</Link></PaginationItem>
            );
        }
        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin" color="secondary" outline className='mb-4'>&laquo; 대시보드로 돌아가기</Button>
            <h2 className='page-title'>회원/판매자 관리 (A-102)</h2>

            <Form onSubmit={handleSearch} className='d-flex gap-2 my-4'>
                <Input type="search" placeholder="이메일로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Button type="submit" color="primary" style={{ width: '150px' }}>검색</Button>
            </Form>

            {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                <Table striped>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>이메일</th>
                            <th>권한</th>
                            <th>상태</th>
                            <th>계정 상태 변경</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? users.map(user => (
                            <tr key={user.userId}>
                                <td>{user.userId}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>{user.status}</td>
                                <td>
                                        <Button color="success" size="sm" className='me-2' onClick={() => handleStatusChange(user.userId, 'ACTIVE')}>활성화</Button>
                                        <Button color="warning" size="sm" className='me-2' onClick={() => handleStatusChange(user.userId, 'SUSPENDED')}>일시 정지</Button>
                                        <Button color="danger" size="sm" onClick={() => handleStatusChange(user.userId, 'DEACTIVATED')}>영구 비활성</Button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" className="text-center">해당하는 회원이 없습니다.</td></tr>}
                    </tbody>
                </Table>
            )}
            {pageInfo.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">{renderPagination()}</div>
            )}
        </Container>
    );
}