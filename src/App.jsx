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
import Token from './component/Token'
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
        <Route path='/token' element={<Token/>}/>
      </Routes>
    </>
  )
}

export default App
