# SOMACOM README

## 1. 프로젝트 개요

-   **SOMACOM**은 PC 부품 호환성 검사, AI 기반 추천, 주문/결제 기능을 제공하는 지능형 이커머스 플랫폼입니다.
-   프론트엔드(`SomacomReact`)는 **React + Vite** 기반으로 구축되었으며, 백엔드 API와 통신하여 사용자 인터페이스를 제공합니다.
-   백엔드(`somacom`)는 **Spring Boot + JPA/QueryDSL** 기반으로 구현되어 있으며, 3개의 핵심 시스템 엔진(호환성, 인기도, 추천)을 통해 차별화된 기능을 제공합니다.
-   전체 시스템은 AWS 기반의 **3-Tier 아키텍처**(Frontend - Backend - Database)로 설계되었으며, 각 티어는 독립적으로 배포 및 운영됩니다.

## 2. 저장소 및 프로젝트 구조

### 2.1 `SomacomReact/` (프론트엔드)

| 경로 | 설명 |
| :--- | :--- |
| `src/api/` | Axios 인스턴스 설정 및 백엔드 API 호출 함수 모듈. |
| `src/components/` | 버튼, 모달, 레이아웃 등 재사용 가능한 UI 컴포넌트. |
| `src/hooks/` | `useAuth`, `useCart` 등 상태 로직과 API 연동을 담당하는 커스텀 훅. |
| `src/pages/` | 라우팅의 기본 단위가 되는 페이지 레벨 컴포넌트. (예: `ProductDetailPage`, `CartPage`) |
| `src/store/` | Zustand 또는 Context API를 사용한 전역 상태 관리 (로그인, 사용자 정보 등). |
| `src/utils/` | 포맷팅, 유효성 검사 등 순수 유틸리티 함수. |
| `public/` | 정적 에셋 (이미지, 폰트 등). |

### 2.2 `somacom/` (백엔드 - 참고용)

-   `src/main/java/com/somacom`
    -   `controller/`: `@RestController`를 사용하여 API 엔드포인트를 정의. 역할(User, Seller, Admin)별로 패키지 분리.
    -   `service/`: `@Transactional`을 포함한 핵심 비즈니스 로직. 3대 엔진(`RuleEngineService`, `RecommendationService` 등)이 포함.
    -   `repository/`: `JpaRepository`와 QueryDSL을 사용한 데이터 접근 계층. 동적 쿼리 구현체 포함.
    -   `domain/` 또는 `entity/`: `@Entity` 어노테이션이 적용된 데이터베이스 테이블 매핑 객체.
    -   `dto/`: 계층 간 데이터 전송을 위한 Request/Response 객체.
    -   `config/`: `SecurityConfig`, `CorsConfig`, `WebConfig` 등 애플리케이션 설정.
    -   `aop/`: `UserActionLoggingAspect` 등 사용자 행동 로깅을 위한 AOP 구현.
-   `src/main/resources/`
    -   `application.properties`, `application-prod.properties`: 환경별 설정 파일.
    -   `mappers/`: (MyBatis 사용 시) SQL 쿼리 XML 파일.
    -   `gcp-credentials.json`, `secret.properties`: `.gitignore` 처리된 외부 서비스 인증 정보.

## 3. 핵심 시스템 상세

### 3.1 프론트엔드 (SomacomReact)

#### 3.1.1 기술 스택

-   **Framework**: React
-   **Build Tool**: Vite
-   **Language**: JavaScript (ES6+)
-   **HTTP Client**: Axios
-   **Payment**: Toss Payments SDK
-   **Deployment**: Nginx (Reverse Proxy), AWS EC2

#### 3.1.2 주요 기능 도메인

-   **사용자 인증**: 회원가입, 로그인(`POST /api/auth/signup/*`, `POST /api/auth/login`)을 처리하고 발급된 JWT를 로컬 스토리지에 저장. Axios 인터셉터를 통해 모든 요청 헤더에 인증 토큰을 자동으로 추가.
-   **지능형 검색**: 키워드 자동완성(`GET /api/products/autocomplete`), 카테고리별 동적 필터(`GET /api/products/filters`), 장바구니 호환성 필터(`compatFilter=true`) 등 복합적인 검색 기능을 UI로 제공.
-   **상품 상세**: 상품의 기본 정보, 기술 사양, 판매자 정보, 가격 비교 목록을 한 페이지에 렌더링. 사용자 행동(체류 시간, 이미지 클릭)을 감지하여 `POST /api/logs/action` API를 호출, AI 추천 엔진에 데이터를 제공.
-   **장바구니 및 실시간 호환성 검증**: 장바구니 조회(`GET /api/cart`) 시 반환되는 `compatibilityResult` 객체를 분석하여 사용자에게 호환성 상태(SUCCESS, WARN, FAIL)와 사유를 시각적으로 표시.
-   **주문 및 결제**: 장바구니 또는 즉시 구매를 통해 주문서 작성. 백엔드로부터 `paymentOrderId`를 받아 토스 페이먼츠 위젯을 초기화하고, 결제 성공/실패 시 지정된 페이지로 리디렉션 및 백엔드에 최종 승인 요청.
-   **마이페이지**: 주문 내역/상태 조회, 회원 정보 수정, 회원 탈퇴 기능 제공.
-   **판매자/관리자**: 판매자 대시보드(상품/주문 관리), 관리자 대시보드(회원/부품 데이터 관리) 등 각 역할에 맞는 전용 UI 제공.

### 3.2 백엔드 (SOMACOM Spring Boot)

#### 3.2.1 핵심 시스템 엔진

1.  **`SYS-1`: 호환성 규칙 엔진 (Rule Engine)**
    -   **실시간 검증**: 사용자가 장바구니를 조회할 때마다 담긴 부품들의 사양(소켓, 메모리 타입 등)을 실시간으로 비교하여 호환성 결과를 반환.
    -   **배치 처리**: 매일 새벽, 모든 부품 조합에 대한 호환성 점수를 미리 계산하여 `product_compatibility_scores` 테이블에 저장. 이는 '호환성 필터' 검색 시 빠른 응답을 가능하게 함.

2.  **`SYS-2`: 인기도 엔진 (Popularity Engine)**
    -   과거 주문 데이터를 분석하여 'A 부품을 구매한 사용자가 B 부품도 함께 구매'하는 패턴을 점수화. `product_popularity_scores` 테이블에 저장하여 연관 상품 추천에 활용.

3.  **`SYS-3`: 하이브리드 추천 엔진 (Intent Engine)**
    -   사용자의 모든 행동(조회, 검색, 필터링, 장바구니 추가 등)을 AOP로 로깅하여 `user_intent_score` 테이블에 누적.
    -   Google Cloud Retail AI의 "유사 상품" 모델과 내부 인기도/호환성 점수를 결합하여 개인화된 상품 목록을 `GET /api/recommendations/personal` API를 통해 제공.

## 4. 개발 및 실행 가이드

### 4.1 선행 요구사항

-   Node.js (v16 이상 권장)
-   npm
-   실행 중인 SOMACOM 백엔드 서버

### 4.2 프론트엔드 실행

1.  **의존성 설치**
    ```bash
    npm install
    ```

2.  **개발 서버 실행**
    -   `vite.config.js`에 백엔드 서버로의 프록시 설정을 추가합니다.
        ```javascript
        // vite.config.js
        export default defineConfig({
          // ...
          server: {
            proxy: {
              '/api': {
                target: 'http://3.106.195.135:8080', // 실제 백엔드 서버 주소
                changeOrigin: true,
              },
            },
          },
        });
        ```
    -   개발 서버를 시작합니다.
        ```bash
        npm run dev
        ```
    -   `http://localhost:5173`으로 접속합니다.

3.  **프로덕션 빌드**
    ```bash
    npm run build
    ```
    -   `dist` 폴더에 배포용 정적 파일이 생성됩니다. 이 파일들을 Nginx 서버의 `/var/www/html` 경로에 업로드하여 배포합니다.

## 5. 아키텍처 및 주요 흐름

### 5.1 3-Tier 아키텍처

SOMACOM은 AWS 위에 구축된 3-Tier 아키텍처를 따릅니다.

| 구분 | IP 주소 | 역할 및 기술 |
| :--- | :--- | :--- |
| **Frontend** | `3.26.244.183` | **(Client Tier)** React 정적 파일을 호스팅하고, API 요청을 백엔드로 프록시하는 Nginx 웹 서버. |
| **Backend** | `3.106.195.135` | **(Application Tier)** Docker 컨테이너에서 실행되는 Spring Boot API 서버. 비즈니스 로직 및 시스템 엔진 담당. |
| **Database** | `13.239.20.87` | **(Data Tier)** Docker 컨테이너에서 실행되는 MariaDB 데이터베이스. |

사용자 요청은 프론트엔드 서버(Nginx)를 통해 수신되며, `/api/` 경로의 요청은 백엔드 서버로 전달(Reverse Proxy)됩니다.

### 5.2 결제 흐름 (Toss Payments)

안전한 결제를 위해 클라이언트-서버 간 금액 검증을 포함한 표준 결제 흐름을 따릅니다.

1.  **결제 대기 주문 생성**: 사용자가 '결제하기' 버튼 클릭 시, 프론트엔드는 주문 정보(배송지 등)를 `POST /api/orders`로 전송합니다.
2.  **고유 주문 ID 수신**: 백엔드는 금액을 서버 측에서 재계산하여 `PENDING` 상태의 주문을 생성하고, 토스 페이먼츠 연동을 위한 고유 ID(`paymentOrderId`)를 프론트엔드에 반환합니다.
3.  **결제창 호출**: 프론트엔드는 수신한 `paymentOrderId`와 주문명, 금액을 사용하여 토스 페이먼츠의 `requestPayment` SDK 함수를 호출합니다.
4.  **결제 승인 요청**: 사용자가 결제를 완료하면, 토스 서버는 성공 콜백 URL로 `paymentKey`, `orderId`, `amount`를 쿼리 파라미터와 함께 리디렉션합니다. 프론트엔드는 이 정보들을 즉시 백엔드의 `POST /api/payments/toss/confirm` API로 전송합니다.
5.  **서버 측 최종 승인 및 검증**:
    -   백엔드는 `orderId`로 DB에서 `PENDING` 상태의 주문을 조회합니다.
    -   DB에 저장된 금액과 프론트로부터 전달받은 `amount`가 **일치하는지 검증**하여 금액 위변조를 방지합니다.
    -   검증 통과 시, 토스 페이먼츠의 최종 승인 API를 호출합니다.
    -   성공 시 주문 상태를 `PAID`로 변경하고, 재고를 차감합니다.

### 5.3 AI 추천 흐름

1.  **행동 로깅**: 사용자가 상품 조회, 검색, 장바구니 추가 등 주요 행동을 할 때마다 프론트엔드는 관련 API를 호출합니다. 백엔드의 AOP 로거가 이를 감지하여 사용자의 행동 로그를 기록합니다.
2.  **의도 점수화**: `UserIntentLoggingService`는 이 로그를 바탕으로 특정 사양(예: `socket_LGA1700`, `mem_DDR5`)에 대한 사용자의 '의도 점수'를 갱신합니다.
3.  **추천 요청**: 사용자가 추천 상품 목록을 요청(`GET /api/recommendations/personal`)합니다.
4.  **결과 생성**: `RecommendationService`는 사용자의 의도 점수, 호환성 점수, 인기도 점수, Google Cloud Retail AI의 추천 결과를 종합하여 최종 추천 목록을 생성하고 반환합니다.

## 6. 품질 및 보안 고려사항

-   **인증/인가**: 시스템은 JWT(Access/Refresh Token) 기반의 인증을 사용합니다. 백엔드 Spring Security를 통해 각 API 엔드포인트마다 역할(`USER`, `SELLER`, `ADMIN`)에 따른 접근 제어를 적용합니다.
-   **결제 보안**: 결제 금액을 클라이언트가 아닌 서버에서 직접 계산하고, 최종 승인 단계에서 금액을 재검증하여 결제 정보 위변조 시도를 차단합니다.
-   **비밀정보 관리**: 백엔드는 `gcp-credentials.json`, `secret.properties` 등 민감한 설정 파일을 `.gitignore`로 관리하며, 프론트엔드는 토스 페이먼츠 클라이언트 키와 같은 정보를 환경 변수(`.env`)를 통해 주입받아야 합니다.
-   **배포**: 백엔드와 데이터베이스는 Docker 컨테이너로 패키징되어 일관된 배포 환경을 보장합니다. 프론트엔드는 Nginx를 통해 정적 파일을 효율적으로 서빙하고 리버스 프록시 역할을 수행합니다.

## 7. 참고 자료 및 후속 작업

### 7.1 주요 문서

-   `api.md`: 프론트엔드 개발에 필요한 모든 API 명세서.
-   `todo_list.md`: 백엔드 개발 마스터 플랜 및 작업 현황.
-   `deployGuide.md`: 3-Tier 아키텍처 서버 구성 및 배포 절차 가이드.
-   `master.sql`: 전체 데이터베이스 스키마 정의.

### 7.2 향후 개선 제안

-   **기반 모델(BaseSpec) 논리적 삭제**: 관리자가 기반 모델을 삭제할 때, 관련된 모든 상품이 자연스럽게 비노출되도록 하는 로직(`A-204`) 구현 및 전체 상품 조회 쿼리 재검증.
-   **AI 추천 모델 고도화**: 수집된 사용자 행동 로그를 기반으로 Google Cloud Retail AI 모델을 주기적으로 재학습하고, 추천 품질(CTR, CVR)을 모니터링하는 파이프라인 구축.
-   **프론트엔드 테스트 커버리지 확대**: Jest와 React Testing Library를 사용하여 주요 컴포넌트 및 커스텀 훅에 대한 단위/통합 테스트 코드 작성.
-   **상태 관리 리팩토링**: 전역 상태의 복잡성이 증가할 경우, Zustand 또는 Recoil과 같은 상태 관리 라이브러리를 도입하여 데이터 흐름을 체계적으로 관리.

---

# SOMACOM README (English)

## 1. Project Overview

-   **SOMACOM** is an intelligent e-commerce platform for PC components, featuring compatibility checks, AI-based recommendations, and order/payment functionalities.
-   The frontend (`SomacomReact`) is built with **React + Vite**, providing the user interface by communicating with the backend API.
-   The backend (`somacom`) is implemented with **Spring Boot + JPA/QueryDSL**, offering differentiated features through three core system engines (Compatibility, Popularity, Recommendation).
-   The entire system is designed with a **3-Tier Architecture** (Frontend - Backend - Database) on AWS, with each tier being independently deployed and managed.

## 2. Repository and Project Structure

### 2.1 `SomacomReact/` (Frontend)

| Path | Description |
| :--- | :--- |
| `src/api/` | Axios instance configuration and backend API call function modules. |
| `src/components/` | Reusable UI components like Buttons, Modals, and Layouts. |
| `src/hooks/` | Custom hooks managing state logic and API integration (e.g., `useAuth`, `useCart`). |
| `src/pages/` | Page-level components that serve as the base units for routing (e.g., `ProductDetailPage`, `CartPage`). |
| `src/store/` | Global state management using Zustand or Context API (for login status, user info, etc.). |
| `src/utils/` | Pure utility functions for formatting, validation, etc. |
| `public/` | Static assets (images, fonts, etc.). |

### 2.2 `somacom/` (Backend - for reference)

-   `src/main/java/com/somacom`
    -   `controller/`: Defines API endpoints using `@RestController`, with packages separated by role (User, Seller, Admin).
    -   `service/`: Core business logic with `@Transactional`, including the three main engines (`RuleEngineService`, `RecommendationService`).
    -   `repository/`: Data access layer using `JpaRepository` and QueryDSL, including implementations for dynamic queries.
    -   `domain/` or `entity/`: Database table mapping objects annotated with `@Entity`.
    -   `dto/`: Request/Response objects for data transfer between layers.
    -   `config/`: Application settings like `SecurityConfig`, `CorsConfig`, `WebConfig`.
    -   `aop/`: AOP implementations for cross-cutting concerns, such as `UserActionLoggingAspect` for user action logging.
-   `src/main/resources/`
    -   `application.properties`, `application-prod.properties`: Environment-specific configuration files.
    -   `mappers/`: SQL query XML files (if using MyBatis).
    -   `gcp-credentials.json`, `secret.properties`: External service credentials, excluded by `.gitignore`.

## 3. Core System Details

### 3.1 Frontend (SomacomReact)

#### 3.1.1 Tech Stack

-   **Framework**: React
-   **Build Tool**: Vite
-   **Language**: JavaScript (ES6+)
-   **HTTP Client**: Axios
-   **Payment**: Toss Payments SDK
-   **Deployment**: Nginx (Reverse Proxy), AWS EC2

#### 3.1.2 Key Domain Features

-   **User Authentication**: Handles signup and login (`POST /api/auth/signup/*`, `POST /api/auth/login`), storing the issued JWT in local storage. An Axios interceptor automatically adds the auth token to all request headers.
-   **Intelligent Search**: Provides a UI for complex search functionalities, including keyword autocomplete (`GET /api/products/autocomplete`), dynamic filters by category (`GET /api/products/filters`), and a cart compatibility filter (`compatFilter=true`).
-   **Product Details**: Renders a product's basic info, tech specs, seller details, and a price comparison list on a single page. Detects user actions (stay duration, image clicks) and calls the `POST /api/logs/action` API to feed data to the AI recommendation engine.
-   **Cart & Real-time Compatibility Check**: When viewing the cart (`GET /api/cart`), it parses the returned `compatibilityResult` object to visually display the compatibility status (SUCCESS, WARN, FAIL) and reasons to the user.
-   **Order & Payment**: Manages order form creation from the cart or for instant purchases. Initializes the Toss Payments widget with the `paymentOrderId` from the backend and handles redirection and final approval requests upon payment success/failure.
-   **My Page**: Provides features for viewing order history/status, updating user information, and account deactivation.
-   **Seller/Admin Pages**: Offers dedicated UIs for each role, such as a seller dashboard (product/order management) and an admin dashboard (user/parts data management).

### 3.2 Backend (SOMACOM Spring Boot)

#### 3.2.1 Core System Engines

1.  **`SYS-1`: Compatibility Rule Engine**
    -   **Real-time Validation**: Compares the specifications (socket, memory type, etc.) of components in the user's cart in real-time to return a compatibility result.
    -   **Batch Processing**: Pre-calculates compatibility scores for all component combinations daily and stores them in the `product_compatibility_scores` table, enabling fast responses for 'compatibility filter' searches.

2.  **`SYS-2`: Popularity Engine**
    -   Analyzes past order data to score patterns like 'users who bought component A also bought component B'. The scores are stored in the `product_popularity_scores` table and used for related product recommendations.

3.  **`SYS-3`: Hybrid Recommendation Engine**
    -   Logs all user actions (views, searches, filters, cart additions) via AOP and aggregates them in the `user_intent_score` table.
    -   Combines Google Cloud Retail AI's "Similar Items" model with internal popularity/compatibility scores to provide personalized product lists via the `GET /api/recommendations/personal` API.

## 4. Development & Execution Guide

### 4.1 Prerequisites

-   Node.js (v16 or higher recommended)
-   npm
-   A running instance of the SOMACOM backend server

### 4.2 Running the Frontend

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    -   Add a proxy setting to `vite.config.js` for the backend server.
        ```javascript
        // vite.config.js
        export default defineConfig({
          // ...
          server: {
            proxy: {
              '/api': {
                target: 'http://3.106.195.135:8080', // Actual backend server address
                changeOrigin: true,
              },
            },
          },
        });
        ```
    -   Start the development server.
        ```bash
        npm run dev
        ```
    -   Access it at `http://localhost:5173`.

3.  **Build for Production**
    ```bash
    npm run build
    ```
    -   Static files for deployment will be generated in the `dist` folder. Upload these files to the `/var/www/html` directory of the Nginx server for deployment.

## 5. Architecture & Major Flows

### 5.1 3-Tier Architecture

SOMACOM follows a 3-Tier architecture built on AWS.

| Tier | IP Address | Role & Technology |
| :--- | :--- | :--- |
| **Frontend** | `3.26.244.183` | **(Client Tier)** An Nginx web server that hosts React static files and reverse-proxies API requests to the backend. |
| **Backend** | `3.106.195.135` | **(Application Tier)** A Spring Boot API server running in a Docker container, responsible for business logic and system engines. |
| **Database** | `13.239.20.87` | **(Data Tier)** A MariaDB database running in a Docker container. |

User requests are received by the frontend server (Nginx), and requests to the `/api/` path are forwarded (Reverse Proxy) to the backend server.

### 5.2 Payment Flow (Toss Payments)

The system follows a standard payment flow with client-server amount verification for secure transactions.

1.  **Create Pending Order**: When a user clicks 'Pay', the frontend sends order information (shipping address, etc.) to `POST /api/orders`.
2.  **Receive Unique Order ID**: The backend recalculates the total amount on the server side, creates a `PENDING` order, and returns a unique `paymentOrderId` for Toss Payments integration.
3.  **Invoke Payment Widget**: The frontend calls the Toss Payments `requestPayment` SDK function using the received `paymentOrderId`, order name, and amount.
4.  **Request Payment Approval**: Upon successful payment, the Toss server redirects to the success callback URL with `paymentKey`, `orderId`, and `amount` as query parameters. The frontend immediately sends this information to the backend's `POST /api/payments/toss/confirm` API.
5.  **Server-Side Final Approval & Verification**:
    -   The backend retrieves the `PENDING` order from the DB using the `orderId`.
    -   It **verifies that the amount** from the DB matches the `amount` received from the frontend to prevent amount tampering.
    -   If verification passes, it calls the Toss Payments final approval API.
    -   On success, it updates the order status to `PAID` and decrements stock.

### 5.3 AI Recommendation Flow

1.  **Action Logging**: Whenever a user performs a key action (product view, search, add to cart), the frontend calls the relevant API. The backend's AOP logger detects this and records the user's action log.
2.  **Intent Scoring**: The `UserIntentLoggingService` updates the user's 'intent score' for specific attributes (e.g., `socket_LGA1700`, `mem_DDR5`) based on these logs.
3.  **Recommendation Request**: The user requests a list of recommended products (`GET /api/recommendations/personal`).
4.  **Result Generation**: The `RecommendationService` combines the user's intent scores, compatibility scores, popularity scores, and recommendations from Google Cloud Retail AI to generate and return a final recommendation list.

## 6. Quality & Security Considerations

-   **Authentication/Authorization**: The system uses JWT (Access/Refresh Token) based authentication. The backend applies role-based access control (`USER`, `SELLER`, `ADMIN`) for each API endpoint via Spring Security.
-   **Payment Security**: The payment amount is calculated on the server, not the client, and is re-verified during the final approval step to block payment tampering attempts.
-   **Secrets Management**: The backend uses `.gitignore` to manage sensitive configuration files like `gcp-credentials.json` and `secret.properties`. The frontend should receive secrets like the Toss Payments Client Key via environment variables (`.env`).
-   **Deployment**: The backend and database are containerized with Docker for a consistent deployment environment. The frontend uses Nginx to efficiently serve static files and act as a reverse proxy.

## 7. References & Future Work

### 7.1 Key Documents

-   `api.md`: Full API specification for frontend development.
-   `todo_list.md`: Backend development master plan and task status.
-   `deployGuide.md`: Guide for 3-Tier architecture server configuration and deployment procedures.
-   `master.sql`: The complete database schema definition.

### 7.2 Proposed Future Improvements

-   **BaseSpec Soft Delete**: Implement the logic (`A-204`) for soft-deleting a base model, ensuring all related products are naturally hidden, and re-verify all product query logic.
-   **AI Recommendation Model Enhancement**: Periodically retrain the Google Cloud Retail AI model based on collected user action logs and build a pipeline to monitor recommendation quality (CTR, CVR).
-   **Expand Frontend Test Coverage**: Write unit/integration tests for major components and custom hooks using Jest and React Testing Library.
-   **State Management Refactoring**: If global state complexity increases, introduce a state management library like Zustand or Recoil to systematically manage data flow.
