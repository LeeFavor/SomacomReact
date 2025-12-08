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
      </Routes>
    </>
  )
}

export default App
