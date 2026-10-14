# UNFRAME U#

에디션 번호로 전시·예술 기록을 발행하는 매거진입니다.
Vite, React, Firebase Authentication/Firestore, TipTap을 사용합니다.
운영 사이트는 https://magazine.unframe.kr 이며 Firebase 프로젝트는 `uarchive-8e437`입니다.

## 개발과 검증

환경 변수 목록은 `.env.example`을 참고합니다. 실제 값은 로컬 `.env`와
Netlify 환경 변수에 저장하고 커밋하지 않습니다.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

실제 권한 테스트는 운영 Firebase에 연결하지 않고 에뮬레이터로 실행합니다.
Java 21 이상과 Firebase CLI가 필요합니다.

```sh
firebase emulators:exec --only firestore --project demo-unframe-mag "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test tests/firestore.rules.mjs"
```

## 구조

- `src/App.jsx`: 데이터 라우터, 권한 확인, 공통 메뉴·알림, 필요 시 페이지 로딩.
- `src/Pages`: 홈, About, 서재, 게시물, 에디터, 관리자.
- `src/hooks/useDrafts.js`: 30초 자동 저장, 문서별 로컬 복구, 원자적 발행.
- `src/lib/draftRecovery.js`: 복구본 형식과 안전한 삭제, 에디션 번호 계산.
- `src/lib/publicationTransaction.js`: 다른 발행자가 번호를 먼저 배정한 경우의 제한된 재시도.
- `src/hooks/useSlideGalleryRuntime.js`: 에디터·게시물 공통 슬라이드 동작.
- `src/tiptap`, `src/styles/blocks.css`: 편집 블록과 공통 표시 스타일.
- `firestore.rules`, `firestore.indexes.json`: 운영 권한·인덱스의 관리 원본.
- `netlify/functions/client-error.mjs`: 개인정보·본문·토큰을 제외한 오류 분류 로그.
- `ops/rollup`: 기존 인기 글 통계 집계 서버. 프런트 배포와 별도로 운영합니다.

## 직원 작업

Google로 로그인한 뒤 관리자 또는 에디터 권한으로 글을 작성합니다.
30초마다 서버에 임시 저장하며, 저장 전 내용은 이 브라우저의 복구본에도 남깁니다.
페이지 이동 시 저장 여부를 선택하고, 복구 안내가 있으면 복구 또는 삭제를 직접 선택합니다.
복구는 즉시 발행되지 않으며 저장·발행 버튼으로 서버 반영을 확인합니다.
공유 컴퓨터에서는 계정을 로그아웃하고, 필요하지 않은 복구본은 삭제합니다.

갤러리 이미지별 캡션은 우측 인스펙터의 `Slide Captions`에서 입력합니다.
인스펙터는 데스크톱에서 상단 80px 아래에 고정되고 자체 스크롤을 제공합니다.

관리자 페이지의 사이트 링크에서 네트워크, 뉴스레터 가입, 이용약관,
개인정보처리방침의 HTTPS 주소를 등록합니다. 미등록 항목은 공개 화면에서 숨깁니다.
뉴스레터 이메일을 이 사이트에서 직접 수집하지 않고 등록한 가입 서비스로 연결합니다.

배포, 로그인 설정, 규칙 변경, 오류 확인은 [운영 안내](docs/operations.md)를 참고합니다.
