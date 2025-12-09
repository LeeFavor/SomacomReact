import { useState, useEffect, useRef } from 'react';
import { Container, Table, Button, Spinner, Alert, Form, Input, Col, Row, Pagination, PaginationItem, ListGroup, ListGroupItem } from 'reactstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminBaseSpecList() {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageInfo, setPageInfo] = useState({});
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ keyword: '', category: '' });
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);
    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const page = searchParams.get('page') || 0;

    const fetchBaseSpecs = () => {
        setLoading(true);
        // URL 쿼리 파라미터에서 필터 값을 읽어와 API 요청에 사용
        const currentFilters = {
            keyword: searchParams.get('keyword') || '',
            category: searchParams.get('category') || ''
        };
        myAxios(token, setToken).get('/admin/parts', { params: { query: currentFilters.keyword, category: currentFilters.category, page, size: 10 } })
            .then(res => {
                setSpecs(res.data.content); // Assuming paged response
                setPageInfo({ totalPages: res.data.totalPages, number: res.data.number });
            })
            .catch(err => {
                console.error("기반 모델 조회 실패:", err);
                setError("데이터를 불러오는 데 실패했습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchBaseSpecs();
        // URL 파라미터가 변경될 때마다 UI의 필터 입력 상태도 동기화
        setFilters({
            keyword: searchParams.get('keyword') || '',
            category: searchParams.get('category') || ''
        });
    }, [searchParams, token, setToken]);

    // 자동완성 Debounce
    useEffect(() => {
        if (filters.keyword.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const debounce = setTimeout(() => {
            // [수정] api.md의 A-201-LIST 기반 모델 목록 조회 API를 자동완성용으로 사용
            myAxios(token, setToken).get('/products/autocomplete', { params: { keyword: filters.keyword } }) // size를 5로 제한하여 상위 5개만 가져옴
                .then(res => {
                    setSuggestions(res.data); // list 객체
                    setShowSuggestions(true);
                })
                .catch(err => {
                    console.error("자동완성 조회 실패:", err);
                    setSuggestions([]);
                });
        }, 300); // 300ms 지연
        return () => clearTimeout(debounce);
    }, [filters.keyword, token, setToken]);

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

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // 검색어가 있고, 자동완성 목록에 해당 검색어가 존재하는지 확인
        const isValidKeyword = !filters.keyword || suggestions.some(s => s.name === filters.keyword);
        if (filters.keyword && !isValidKeyword) {
            alert("자동완성 목록에 있는 키워드를 선택하여 검색해주세요.");
            return;
        }
        // 검색 시 필터 값으로 URL 파라미터를 업데이트하고, 첫 페이지로 이동
        setSearchParams({ ...filters, page: 0 });
        setShowSuggestions(false);
    };

    const handleSuggestionClick = (suggestionName) => {
        // 자동완성 항목 클릭 시 키워드 설정 및 창 닫기
        setFilters(prev => ({ ...prev, keyword: suggestionName }));
        setShowSuggestions(false);
    };

    const handleDelete = (baseSpecIdToDelete) => {
        if (!window.confirm(`정말로 이 기반 모델(ID: ${baseSpecIdToDelete})을 삭제하시겠습니까?`)) {
            return;
        }

        myAxios(token, setToken).delete(`/admin/parts/${baseSpecIdToDelete}`)
            .then(() => {
                alert("기반 모델이 성공적으로 삭제되었습니다.");
                fetchBaseSpecs(); // 목록 새로고침
            })
            .catch(err => {
                console.error("기반 모델 삭제 실패:", err);
                alert(err.response?.data?.message || "기반 모델 삭제 중 오류가 발생했습니다.");
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
        const currentParams = Object.fromEntries(searchParams.entries());

        // 이전 페이지 그룹
        if (currentPage > 0) {
            items.push(
                <PaginationItem key="prev-group">
                    <Link to={`?${new URLSearchParams({ ...currentParams, page: Math.max(0, currentPage - pageRangeDisplayed) }).toString()}`} className="page-link">«</Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === currentPage}>
                    <Link to={`?${new URLSearchParams({ ...currentParams, page: i }).toString()}`} className="page-link">{i + 1}</Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹
        if (currentPage < totalPages - 1) {
            items.push(<PaginationItem key="next-group"><Link to={`?${new URLSearchParams({ ...currentParams, page: Math.min(totalPages - 1, currentPage + pageRangeDisplayed) }).toString()}`} className="page-link">»</Link></PaginationItem>);
        }
        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin" color="secondary" outline className='mb-4'>&laquo; 대시보드로 돌아가기</Button>
            <h2 className='page-title'>기반 모델 관리 (A-201)</h2>

            <Form onSubmit={handleSearch} className='my-4'>
                <Row className='g-2'>
                    <Col md={8} ref={searchContainerRef} style={{ position: 'relative' }}>
                        <Input type="search" name="keyword" placeholder="모델명 검색..." value={filters.keyword} onChange={handleFilterChange} autoComplete="off" />
                        {showSuggestions && suggestions.length > 0 && (
                            <ListGroup style={{ position: 'absolute', top: '100%', width: '100%', zIndex: 1000, border: '1px solid #ddd' }}>
                                {suggestions.map((s) => (
                                    <ListGroupItem key={s.baseSpecId} action tag="button" type="button" onClick={() => handleSuggestionClick(s.name)}
                                        style={{ cursor: 'pointer', textAlign: 'left' }}>
                                        {s.name}
                                    </ListGroupItem>
                                ))}
                            </ListGroup>
                        )}
                    </Col>
                    <Col md={2}>
                        <Input type="select" name="category" value={filters.category} onChange={handleFilterChange}>
                            <option value="">모든 타입</option>
                            <option value="CPU">CPU</option>
                            <option value="Motherboard">Motherboard</option>
                            <option value="RAM">RAM</option>
                            <option value="GPU">GPU</option>
                        </Input>
                    </Col>
                    <Col md={2}><Button type="submit" color="primary" block>검색</Button></Col>
                </Row>
            </Form>
            <Button tag={Link} to="/admin/parts/new" color="primary" className='mb-3'>+ 신규 기반 모델 등록</Button>

            {loading ? <Spinner /> : error ? <Alert color="danger">{error}</Alert> : (
                <Table striped>
                    <thead><tr><th>순번</th><th>모델명</th><th>타입</th><th>관리</th></tr></thead>
                    <tbody>
                        {specs.length > 0 ? specs.map((spec, index) => (
                            <tr key={spec.baseSpecId}>
                                <td>{page * 10 + index + 1}</td>
                                <td>{spec.name}</td>
                                <td>{spec.category}</td>
                                <td><Button color="warning" size="sm" className='me-2' onClick={() => navigate(`/admin/parts/edit/${spec.id}`)}>수정</Button>
                                <Button color="danger" size="sm" onClick={() => handleDelete(spec.id)}>삭제</Button></td>
                            </tr>
                        )) : <tr><td colSpan="4" className="text-center">해당하는 기반 모델이 없습니다.</td></tr>}
                    </tbody>
                </Table>
            )}
            {pageInfo.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">{renderPagination()}</div>
            )}
        </Container>
    );
}