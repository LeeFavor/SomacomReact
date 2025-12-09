import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardImg, CardBody, CardTitle, CardSubtitle, CardText, Input, Label, Button, Pagination, PaginationItem, PaginationLink, Spinner } from 'reactstrap';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';

const ProductCard = ({ product }) => (
    <Col md="4" className="mb-4">
        <Card className='h-100'>
            <a href={`/products/${product.productId}`} className='text-decoration-none text-dark'>
                <CardImg top width="100%" src={`${imageUrl}${product.imageUrl}`} alt={product.productName} style={{ height: '220px', objectFit: 'cover' }} />
                <CardBody>
                    <CardTitle tag="h5" style={{ fontSize: '1rem', height: '40px' }}>{product.productName}</CardTitle>
                    <CardSubtitle tag="h6" className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>{product.companyName}</CardSubtitle>
                    <CardText className='fw-bold fs-5 text-primary'>${product.price?.toLocaleString()}</CardText>
                </CardBody>
            </a>
        </Card>
    </Col>
);

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [pageInfo, setPageInfo] = useState({});
    const [dynamicFilters, setDynamicFilters] = useState({});
    const [selectedFilters, setSelectedFilters] = useState({});
    const [compatFilter, setCompatFilter] = useState(false);
    const [loading, setLoading] = useState(true);

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    // URL 파라미터 변경 시 검색 및 필터 옵션 로드
    useEffect(() => {
        setLoading(true);
        const category = searchParams.get('category');
        const currentCompat = searchParams.get('compatFilter') === 'true';

        // UI 상태 업데이트: `filters[key]=value` 형식의 파라미터를 읽어옴
        const filtersObj = {};
        const filterRegex = /filters\[(.+?)]/;
        for (const [key, value] of searchParams.entries()) {
            const match = key.match(filterRegex);
            if (match) {
                const group = match[1]; // e.g., "socket"
                // 라디오 버튼이므로, 그룹당 하나의 값만 가짐
                filtersObj[group] = value;
            }
        }
        setSelectedFilters(filtersObj);
        setCompatFilter(currentCompat);

        // 1. 카테고리에 맞는 동적 필터 옵션 가져오기
        if (category) {
            myAxios(token, setToken).get('/products/filters', { params: { category } })
                .then(res => setDynamicFilters(res.data))
                .catch(err => {
                    console.error("동적 필터 조회 실패:", err);
                    setDynamicFilters({});
                });
        } else {
            setDynamicFilters({});
        }

        // 2. 검색 결과 가져오기
        const params = Object.fromEntries(searchParams.entries());
        myAxios(token, setToken).get('/products/search', { params })
            .then(res => {
                setProducts(res.data.content);
                setPageInfo({
                    totalPages: res.data.totalPages,
                    number: res.data.number,
                });
            })
            .catch(err => {
                console.error("상품 검색 실패:", err);
                setProducts([]);
            })
            .finally(() => setLoading(false));

    }, [searchParams, token, setToken]);

    const handleFilterChange = (group, value) => {
        const newFilters = { ...selectedFilters };

        // 이미 선택된 라디오 버튼을 다시 클릭하면 선택 해제, 아니면 값 설정
        if (newFilters[group] === value) {
            delete newFilters[group];
        } else {
            newFilters[group] = value;
        }

        setSelectedFilters(newFilters);
    };

    const handleCompatFilterChange = (e) => {
        setCompatFilter(e.target.checked);
    };

    const applyFilters = () => {
        const newParams = new URLSearchParams();
        // 기존 파라미터 중 필터 관련 파라미터를 제외하고 모두 복사
        for (const [key, value] of searchParams.entries()) {
            if (!key.startsWith('filters[')) {
                newParams.append(key, value);
            }
        }

        // 새로운 필터 파라미터를 `filters[key]=value` 형식으로 추가
        Object.entries(selectedFilters).forEach(([group, value]) => {
            newParams.append(`filters[${group}]`, value);
        });

        if (compatFilter) {
            newParams.set('compatFilter', 'true');
        } else {
            newParams.delete('compatFilter');
        }

        newParams.set('page', '0'); // 필터 적용 시 첫 페이지로 이동
        setSearchParams(newParams);
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

        // 이전 페이지 그룹으로 이동
        if (currentPage > 0) {
            items.push(
                <PaginationItem key="prev-group">
                    <Link to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: Math.max(0, currentPage - pageRangeDisplayed) }).toString()}`} className="page-link">
                        «
                    </Link>
                </PaginationItem>
            );
        }

        for (let i = startPage; i < endPage; i++) {            
            items.push(
                <PaginationItem key={i} active={i === currentPage}>
                    <Link to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: i }).toString()}`} className="page-link">
                        {i + 1}
                    </Link>
                </PaginationItem>
            );
        }

        // 다음 페이지 그룹으로 이동
        if (currentPage < totalPages - 1) {
            items.push(
                <PaginationItem key="next-group">
                    <Link to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: Math.min(totalPages - 1, currentPage + pageRangeDisplayed) }).toString()}`} className="page-link">
                        »
                    </Link>
                </PaginationItem>
            );
        }
        return <Pagination>{items}</Pagination>;
    };

    return (
        <Container className='mt-4'>
            <h2 className='mb-4'>"{searchParams.get('keyword') || searchParams.get('category') || '전체'}" 검색 결과</h2>
            <Row>
                {/* 필터 사이드바 */}
                <Col md="3">
                    <h3>필터</h3>
                    <Card body>
                        {token && (
                            <div className="mb-3">
                                <Label check>
                                    <Input type="checkbox" checked={compatFilter} onChange={handleCompatFilterChange} />
                                    내 견적과 호환되는 부품만 보기
                                </Label>
                            </div>
                        )}

                        {Object.entries(dynamicFilters).map(([group, options]) => (
                            <div key={group} className="mb-3">
                                <h5>{group.charAt(0).toUpperCase() + group.slice(1)}</h5>
                                {options.map(option => (
                                    <div key={option}>
                                        <Label check>
                                            <Input
                                                type="radio"
                                                name={group} // 같은 그룹 내의 라디오 버튼들은 동일한 name을 가져야 함
                                                checked={selectedFilters[group] === option}
                                                onChange={() => handleFilterChange(group, option)}
                                            />
                                            {option}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <Button color="primary" block onClick={applyFilters}>필터 적용</Button>
                    </Card>
                </Col>

                {/* 검색 결과 */}
                <Col md="9">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner />
                            <p>상품을 불러오는 중입니다...</p>
                        </div>
                    ) : (
                        <>
                            {products.length > 0 ? (
                                <Row>
                                    {products.map(p => <ProductCard key={p.productId} product={p} />)}
                                </Row>
                            ) : (
                                <div className="text-center p-5">
                                    <p>검색 결과가 없습니다.</p>
                                </div>
                            )}
                            <div className="d-flex justify-content-center mt-4">
                                {renderPagination()}
                            </div>
                        </>
                    )}
                </Col>
            </Row>
        </Container>
    );
}