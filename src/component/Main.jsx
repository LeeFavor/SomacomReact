import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, CardImg, CardBody, CardTitle, CardSubtitle, CardText, Button, Nav, NavItem, NavLink } from 'reactstrap';
import { myAxios, imageUrl } from './config';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';

// 상품 카드를 표시하는 재사용 가능한 컴포넌트
const ProductCard = ({ product }) => (
  <Col md="3" className="mb-4">
    <Card className='h-100'>
      {/* API 응답에 맞춰 productId, imageUrl, productName, companyName, price 사용 */}
      <a href={`/products/${product.productId}`} className='text-decoration-none text-dark'>
        <CardImg top width="100%" style={{ height: '220px', objectFit: 'cover' }} src={`${imageUrl}${product.imageUrl}`} alt={product.productName} />
        <CardBody>
          <CardTitle tag="h5" style={{ fontSize: '1rem', height: '40px' }}>{product.productName}</CardTitle>
          <CardSubtitle tag="h6" className="mb-2 text-muted" style={{ fontSize: '0.9rem' }}>{product.companyName}</CardSubtitle>
          <CardText className='fw-bold fs-5 text-primary'>${product.price.toLocaleString()}</CardText>
        </CardBody>
      </a>
      {product.baseSpecName && (
        <div className="p-2 text-center border-top">
          <a href={`/search?keyword=${product.baseSpecName}`} className="btn btn-sm btn-outline-primary w-100">동일 모델 검색</a>
        </div>
      )}
    </Card>
  </Col>
);

// AI 추천 광고 상품 카드
const AdProductCard = ({ product }) => (
  <Col md="3" className="mb-4">
    <Card className='h-100' style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
      <CardBody className='d-flex flex-column justify-content-center align-items-center text-center'>
        <h5 style={{ color: '#b45309' }}>✨ 회원님을 위한 맞춤 광고</h5>
        <a href={`/products/${product.productId}`} className='text-decoration-none text-dark w-100 mt-2'>
          <Card className='w-100'>
            <CardImg top width="100%" src={`${imageUrl}${product.imageUrl}`} alt={product.productName} style={{ height: '150px', objectFit: 'cover' }} />
            <CardBody className='p-2'>
              <CardTitle tag="h6" style={{ fontSize: '0.9rem' }}>{product.productName}</CardTitle>
              <CardSubtitle tag="h6" className="mb-1 text-muted" style={{ fontSize: '0.8rem' }}>{product.companyName}</CardSubtitle>
              <CardText className='fw-bold text-primary'>${product.price.toLocaleString()}</CardText>
            </CardBody>
          </Card>
        </a>
      </CardBody>
    </Card>
  </Col>
);

export default function Main() {
  const [popularProducts, setPopularProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const token = useAtomValue(tokenAtom);
  const setToken = useSetAtom(tokenAtom);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. 인기(랜덤) 상품 목록 조회
    myAxios(token, setToken).get('/products/popular')
      .then(res => {
        // const shuffled = res.data.content.sort(() => 0.5 - Math.random());
        setPopularProducts(res.data);
      })
      .catch(err => console.error("인기 상품 조회 실패:", err));

    // // 2. 카테고리 목록 조회
    // myAxios(token, setToken).get('/products/categories')
    //   .then(res => setCategories(res.data))
    //   .catch(err => console.error("카테고리 조회 실패:", err));


    // 3. AI 추천 상품 조회 (로그인 상태일 때만)
    if (token) {
      const fetchRecommendations = async () => {
        try {
          // AI 개인화 추천 3개
          const personalRecPromise = myAxios(token, setToken).get('/recommendations/personal', { params: { count: 1 } });
          // console.log("111", personalRecPromise)
          // 장바구니 호환성 기반 추천 3개
          const compatRecPromise = myAxios(token, setToken).get('/products/search', { params: { compatFilter: true, size: 21 } })
            .then(res => {
              const allProducts = res.data.content;
              if (!allProducts || allProducts.length === 0) {
                return { data: { content: [] } };
              }
              const len = allProducts.length;
              const indices = new Set([0, Math.floor(len * 0.5), len - 1]);
              const finalProducts = Array.from(indices).map(i => allProducts[i]).filter(Boolean);
              return { data: { content: finalProducts } };
            });
          console.log(compatRecPromise)

          const [personalRes, compatRes] = await Promise.all([personalRecPromise, compatRecPromise]);
          // console.log(personalRes, compatRes)

          // AI 추천 상품 데이터 가공 (isAd 플래그 추가)
          const personalProducts = personalRes.data.map(item => ({ ...item.product, isAd: true }));
          const compatProducts = compatRes.data.content;

          // 두 결과를 합쳐서 상태 업데이트
          setRecommendedProducts([...personalProducts, ...compatProducts]);
          // console.log("111", recommendedProducts)
        } catch (error) {
          console.error("AI 추천 상품 조회 실패:", error);
        }
      };
      fetchRecommendations();
    }
  }, [token, setToken]);

  const handleCategoryClick = (e, category) => {
    e.preventDefault();
    navigate(`/search?category=${category}`);
  }

  return (
    <Container className='mt-4'>
      {/* 1. 히어로 배너 */}
      <Row>
        <Col>
          <div className="p-5 mb-4 rounded-3 text-white" style={{ background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)' }}>
            <h2>나만의 PC, SOMACOM에서 완성하세요</h2>
            <p>AI가 추천하는 최적의 부품 조합을 만나보세요.</p>
          </div>
        </Col>
      </Row>

      {/* 2. 카테고리 네비게이션 */}
      <Row className='mb-4'>
        <Col>
          <h4 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>카테고리</h4>
          <Nav>

            <NavItem key="Motherboard"><NavLink href={`/search?category=Motherboard`} onClick={(e) => handleCategoryClick(e, "Motherboard")} className='btn btn-secondary me-2'>Motherboard</NavLink></NavItem>
            <NavItem key="CPU"><NavLink href={`/search?category=CPU`} onClick={(e) => handleCategoryClick(e, "CPU")} className='btn btn-secondary me-2'>CPU</NavLink></NavItem>
            <NavItem key="GPU"><NavLink href={`/search?category=GPU`} onClick={(e) => handleCategoryClick(e, "GPU")} className='btn btn-secondary me-2'>GPU</NavLink></NavItem>
            <NavItem key="RAM"><NavLink href={`/search?category=RAM`} onClick={(e) => handleCategoryClick(e, "RAM")} className='btn btn-secondary me-2'>RAM</NavLink></NavItem>
          </Nav>
        </Col>
      </Row>

      {/* 3. 인기 상품 섹션 */}
      <Row>
        <Col>
          <h3 className="mb-3" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>🔥 지금 가장 인기있는 상품</h3>
        </Col>
      </Row>
      <Row>
        {popularProducts.map(p => <ProductCard key={p.productId} product={p} />)}
      </Row>

      {/* 4. AI 추천 상품 섹션 */}
      {token &&
        <>
          <Row className='mt-5'>
            <Col>
              <h3 className="mb-3" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>🚀 AI 추천! 회원님을 위한 상품</h3>
            </Col>
          </Row>
          <Row>
            {recommendedProducts.map(p =>
              p.isAd ? <AdProductCard key={p.productId} product={p} /> : <ProductCard key={p.productId} product={p} />
            )}

          </Row>
        </>
      }
    </Container>
  );
}