# U# 운영 안내

## 배포

Netlify는 `main` 푸시를 기준으로 `npm run build`를 실행하고 `dist`를 게시합니다.
`netlify.toml`이 함수 경로를 지정합니다. Firebase 규칙은 Git 푸시만으로 배포되지 않습니다.

규칙을 수정하면 먼저 `npm test`와 Firestore 에뮬레이터 권한 테스트를 실행하고,
명시적으로 올바른 프로젝트에 배포합니다.

```sh
firebase deploy --only firestore:rules --project uarchive-8e437
```

인덱스 파일은 기존 운영 인덱스를 보존합니다. 인덱스 배포는 변경이 있을 때만 별도로 실행합니다.
대상 프로젝트가 다른 UNFRAME 서비스인지 항상 구분합니다.

발행은 `counters/articles`의 `lastIndex`를 1씩 증가시키면서 본문과 번호를 같은
트랜잭션으로 기록합니다. 초기 도입 시 운영 글의 최고 `sortIndex`를 확인하고
관리자 권한으로 카운터를 초기화합니다. 이미 있는 카운터를 낮추거나 덮어쓰지 않습니다.
필드는 `lastIndex`, `articleId`, `updatedAt`입니다.
공개 글의 에디션 번호는 수정 발행에서 바뀌지 않습니다.

## Google 로그인

현재 기본 방식은 사용자 클릭으로 바로 열리는 Firebase 팝업입니다.
Chrome이라는 이유로 무조건 redirect를 사용하지 않습니다.
직접 확인한 Firebase 허용 도메인에는 `magazine.unframe.kr`,
`glowing-sorbet-6211c1.netlify.app`, `localhost`가 있습니다.
새 도메인으로 옮기면 Firebase Authentication의 허용 도메인에 별도로 등록합니다.

임베디드 브라우저가 Google 인증을 막는 경우 일반 브라우저에서 로그인해야 할 수 있습니다.
사이트 코드는 브라우저나 Google의 인증 제한을 해제하지 않습니다.
실제 직원 기기에서 팝업 표시뿐 아니라 로그인 완료와 권한 표시까지 확인합니다.

redirect가 필요한 환경을 위한 동일 출처 프록시는 `public/_redirects`에 준비했습니다.
활성화 전 Google Cloud의 실제 OAuth 클라이언트에
`https://magazine.unframe.kr/__/auth/handler`를 허용하고 프록시 응답을 확인해야 합니다.
그 뒤 Netlify에서 `VITE_FIREBASE_AUTH_PROXY=true`를 설정하고 다시 배포합니다.
이 설정을 확인하지 않은 상태에서 활성화하지 않습니다.
기본값은 false이며 다른 Firebase 설정은 유지합니다.

참고: [Firebase redirect 지침](https://firebase.google.com/docs/auth/web/redirect-best-practices),
[Netlify 프록시 지침](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

## 작성 내용 보호

자동 저장은 계속 타이핑하더라도 30초 주기를 유지합니다.
실패하면 저장 시간을 갱신하지 않고, 최신 복구본과 미저장 표시를 유지합니다.
페이지 내부 이동, 새로고침, 탭 닫기 전에 미저장 여부를 확인합니다.
복구본은 사용자·문서별로 분리하고 다른 탭이 나중에 쓴 복구본은 오래된 요청이 삭제하지 않습니다.
브라우저 저장소를 사용할 수 없는 환경에서는 복구 제한 안내가 표시됩니다.
로컬 복구는 기기 분실이나 브라우저 데이터 삭제에 대한 서버 백업을 대체하지 않습니다.

## 업데이트와 복구

서비스 워커는 새 버전이 나와도 작성 화면을 자동으로 새로고침하지 않습니다.
내용 저장 후 업데이트 버튼을 누릅니다. 에디터·관리자·문서 엔진은 첫 방문의
사전 캐시 대상에서 제외하고 실제 방문 이후에 캐시합니다.
인증 경로와 API는 SPA 문서 캐시에서 제외합니다.

문제가 생기면 Netlify의 이전 정상 배포로 사이트를 복구할 수 있습니다.
단, 이전 버전에는 원자적 번호 배정이 없을 수 있으므로 구버전 발행을 재개하지 말고
편집 내용을 보존한 뒤 신버전 발행 기능을 복구합니다.
규칙은 `firestore.rules`와 운영 배포 상태를 대조해 수정합니다.

## 오류 확인

오류 화면의 '오류 정보 복사'로 최근 분류 기록을 얻을 수 있습니다.
Netlify 함수 `client-error` 로그에서 `[uf:client-error]`를 찾으면
오류 분류, 익명화된 페이지 경로, 브라우저 종류, 빌드 버전을 확인할 수 있습니다.
로그에는 원문 본문·이메일·토큰·URL 쿼리·원문 스택을 보내지 않습니다.
전체 URL이나 민감한 사용자 정보가 필요하면 별도 동의를 얻어 조사합니다.

## 검증 한계

로컬 회귀 테스트와 에뮬레이터 권한 테스트는 직원 기기의 Google 로그인,
실제 관리자 화면의 링크 저장, 뉴스레터 외부 서비스의 동작을 대신하지 않습니다.
새 주소를 등록하면 공개 페이지에서 실제 목적지까지 확인합니다.
