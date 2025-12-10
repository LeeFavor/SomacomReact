import 'bootstrap/dist/css/bootstrap.css'
import { Routes, Route} from 'react-router-dom'
import './App.css'
import Header from './component/Header'
import Main from './component/Main'
import Login from './component/Login'
import LoginSeller from './component/LoginSeller'
import LoginAdmin from './component/LoginAdmin'
import Join from './component/Join'
import JoinSeller from './component/JoinSeller'
import ProductDetail from './component/ProductDetail'
import Cart from './component/Cart'
import Search from './component/Search'
import Mypage from './component/Mypage'
import Token from './component/Token'
import Order from './component/Order'
import PaymentSuccess from './component/PaymentSuccess'
import OrderComplete from './component/OrderComplete'
import AdminDashboard from './component/AdminDashboard'
import AdminUserManagement from './component/AdminUserManagement'
import AdminBaseSpecList from './component/AdminBaseSpecList'
import AdminBaseSpecRequestList from './component/AdminBaseSpecRequestList'
import AdminBaseSpecForm from './component/AdminBaseSpecForm' // [신규] 기반 모델 폼 임포트
import AdminScheduler from './component/AdminScheduler'
import SellerCenter from './component/SellerCenter' // [신규] 판매자 센터 임포트
import SellerOrderManagement from './component/SellerOrderManagement' // [신규] 판매자 주문관리 임포트
import SellerProductForm from './component/SellerProductForm' // [신규] 판매자 상품폼 임포트
import SellerBaseSpecRequest from './component/SellerBaseSpecRequest'; // [신규] 판매자 모델요청 임포트
import AdminLogViewer from './component/AdminLogViewer'
import { fcmTokenAtom, alarmsAtom } from './atoms'
import { useSetAtom, useAtom } from 'jotai/react'
import { useState, useEffect } from 'react'

function App() {
  const [alarm, setAlarm] = useState({});
  const setFcmToken = useSetAtom(fcmTokenAtom);
  const [alarms, setAlarms] = useAtom(alarmsAtom);
  


  return (
    <>
      <Header/>
      <Routes>
        <Route path="/" element={<Main/>}/>
        {/* 로그인 라우트 */}
        <Route path="/login" element={<Login/>}/>
        <Route path="/login-seller" element={<LoginSeller/>}/>
        <Route path="/login-admin" element={<LoginAdmin/>}/>
        {/* 회원가입 라우트 */}
        <Route path="/join" element={<Join/>}/>
        <Route path="/join-seller" element={<JoinSeller/>}/>
        {/* 상품 및 장바구니 라우트 */}
        <Route path="/products/:id" element={<ProductDetail/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/order-complete/:orderId" element={<OrderComplete/>}/>
        {/* 토스 페이먼츠 연동 라우트 */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-fail" element={<div className='p-5 text-center'><h2>결제에 실패했습니다.</h2><p>문제가 반복되면 고객센터로 문의해주세요.</p><a href="/cart" className='btn btn-primary'>장바구니로 돌아가기</a></div>} />
        <Route path="/order" element={<Order/>}/>
        <Route path="/search" element={<Search/>}/>
        <Route path="/mypage" element={<Mypage/>}/>
        <Route path='/token' element={<Token/>}/>
        {/* [신규] 관리자 페이지 라우트 */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUserManagement />} />
        <Route path="/admin/parts" element={<AdminBaseSpecList />} />
        <Route path="/admin/parts/new" element={<AdminBaseSpecForm />} /> {/* 등록 */}
        <Route path="/admin/parts/edit/:baseSpecId" element={<AdminBaseSpecForm />} /> {/* 수정 */}
        <Route path="/admin/requests" element={<AdminBaseSpecRequestList />} />
        <Route path="/admin/scheduler" element={<AdminScheduler />} />
        <Route path="/admin/logs" element={<AdminLogViewer />} />
        {/* [신규] 판매자 페이지 라우트 */}
        <Route path="/seller-center" element={<SellerCenter />} />
        <Route path="/seller/orders" element={<SellerOrderManagement />} />
        <Route path="/seller/products/new" element={<SellerProductForm />} />
        <Route path="/seller/products/edit/:productId" element={<SellerProductForm />} />
        <Route path="/seller/base-spec-request" element={<SellerBaseSpecRequest />} />
      </Routes>
    </>
  )
}

export default App
