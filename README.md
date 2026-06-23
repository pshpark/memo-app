# LOVE & PEACE

Supabase를 백엔드로 사용하는 개인용 메모 웹 앱입니다. 이메일로 로그인한 뒤 메모를 작성하고, 태그·검색·상단 고정 기능으로 메모를 정리할 수 있습니다. 데스크톱과 모바일 화면에 대응하며 PWA로 설치할 수 있습니다.

## 주요 기능

- 이메일 회원가입 및 로그인
- 메모 생성, 조회, 수정, 삭제
- 제목·내용·태그 통합 검색
- 태그별 필터링 및 메모 개수 표시
- 중요 메모 상단 고정
- 라이트·다크 테마
- 클립보드 이미지 붙여넣기 및 Supabase Storage 업로드
- 간단한 텍스트 서식
  - `**굵게**`
  - `- 글머리 목록`
  - `- [ ] 할 일`
  - `- [x] 완료한 일`
- 반응형 사이드바와 전체 화면 모바일 편집기
- PWA 설치 및 정적 리소스 캐싱

## 기술 스택

- React 19
- Vite 8
- Tailwind CSS 4
- Supabase Auth, Database, Storage
- GitHub Pages / GitHub Actions

## 시작하기

### 1. 요구 사항

- Node.js 22 이상 권장
- npm
- Supabase 프로젝트

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 Supabase 프로젝트 정보를 입력합니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`anon` 키는 브라우저에 노출되는 공개 키입니다. 실제 데이터 보호는 아래의 Row Level Security(RLS) 정책으로 처리해야 합니다. `service_role` 키는 절대 프런트엔드 환경 변수에 넣지 마세요.

### 4. Supabase 데이터베이스 설정

Supabase SQL Editor에서 다음 SQL을 실행해 `memos` 테이블과 사용자별 접근 정책을 생성합니다.

```sql
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없음',
  content text not null default '',
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memos_user_updated_idx
  on public.memos (user_id, is_pinned desc, updated_at desc);

alter table public.memos enable row level security;

create policy "Users can read their own memos"
  on public.memos for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own memos"
  on public.memos for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own memos"
  on public.memos for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own memos"
  on public.memos for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### 5. 이미지 Storage 설정

붙여넣은 이미지는 `memo-images` 버킷에 저장되고 공개 URL로 메모 본문에 삽입됩니다. SQL Editor에서 다음 설정을 추가합니다.

```sql
insert into storage.buckets (id, name, public)
values ('memo-images', 'memo-images', true)
on conflict (id) do update set public = true;

create policy "Users can upload their own memo images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memo-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own memo images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memo-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

이미지는 한 장당 최대 10MB까지 붙여넣을 수 있습니다. 버킷이 공개 상태이므로 이미지 URL을 아는 사람은 파일을 조회할 수 있습니다.

### 6. 개발 서버 실행

```bash
npm run dev
```

Vite가 출력한 로컬 주소를 브라우저에서 열면 됩니다.

## 사용 가능한 명령어

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드 생성
npm run preview  # 프로덕션 빌드 로컬 미리보기
npm run lint     # ESLint 코드 검사
```

## 메모 서식

편집기는 전체 Markdown 문법이 아닌, 앱에서 사용하는 일부 문법만 렌더링합니다.

```md
일반 텍스트와 **굵은 텍스트**

- 글머리 목록
- [ ] 아직 하지 않은 일
- [x] 완료한 일
```

이미지를 클립보드에서 편집기에 붙여넣으면 Storage 업로드가 끝난 뒤 다음 형태의 이미지 문법이 본문에 자동으로 추가됩니다.

```md
![이미지 설명](https://...)
```

## 프로젝트 구조

```text
memo-app/
├─ public/
│  ├─ manifest.webmanifest   # PWA 메타데이터
│  ├─ sw.js                  # 서비스 워커와 런타임 캐시
│  └─ icon-*.png             # 설치 아이콘
├─ src/
│  ├─ lib/
│  │  ├─ supabaseClient.js   # Supabase 클라이언트
│  │  └─ folderService.js    # 향후 폴더 기능을 위한 서비스
│  ├─ App.jsx                # 인증, 메모 로직 및 전체 UI
│  ├─ index.css              # Tailwind와 전역 스타일
│  └─ main.jsx               # React 진입점과 서비스 워커 등록
├─ .github/workflows/
│  └─ deploy.yml             # GitHub Pages 자동 배포
├─ vite.config.js
└─ package.json
```

## GitHub Pages 배포

`main` 브랜치에 변경 사항을 푸시하면 GitHub Actions가 앱을 빌드해 GitHub Pages에 배포합니다.

저장소의 **Settings → Secrets and variables → Actions**에 다음 Repository secrets를 등록해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

현재 Vite의 배포 기준 경로는 `/memo-app/`입니다. 저장소 이름이나 배포 경로가 다르면 `vite.config.js`의 `base` 값도 함께 변경해야 합니다.

## PWA와 오프라인 동작

서비스 워커는 같은 출처의 정적 리소스를 런타임에 캐싱합니다. 앱 화면은 일부 오프라인 상황에서 열릴 수 있지만, 메모 데이터는 Supabase에 저장되므로 로그인·동기화·저장에는 네트워크 연결이 필요합니다.

## 참고 사항

- 테마 설정은 브라우저의 `localStorage`에 저장됩니다.
- 메모 목록은 고정 여부와 최근 수정 시간을 기준으로 정렬됩니다.
- 검색과 태그 필터링은 불러온 메모를 대상으로 브라우저에서 수행됩니다.
- `folderService.js`는 현재 화면에 연결되어 있지 않아 폴더 기능은 아직 제공되지 않습니다.
- 메모를 삭제하면 해당 메모에서만 사용하는 첨부 이미지도 Storage에서 함께 삭제됩니다. 같은 이미지 URL을 다른 메모가 참조하고 있으면 파일을 보존합니다.
- 메모를 편집하면서 본문에서 이미지 문법만 제거한 경우에는 Storage 파일이 자동 삭제되지 않습니다.
