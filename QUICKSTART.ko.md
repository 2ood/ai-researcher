
# 퀵스타트 및 가이드 (Quickstart & Walkthroughs)

[English](/QUICKSTART.md) · 한국어

일반적인 작업을 수행하기 위한 단계별 가이드입니다. [README](README.md#quickstart-5-minutes)에는 30초 요약 버전이 있으며, 이 문서는 상세 가이드입니다. 처음 방문하셨나요? **첫 배포(First deploy)**부터 시작하세요.

## 목차

1. [첫 배포: 0에서 라이브까지](#1-첫-배포-0에서-라이브까지)
2. [`python init.py` 작동 방식](#2-python-initpy-작동-방식)
3. [블로그 포스트 작성](#3-블로그-포스트-작성)
4. [논문, 뉴스 및 CV 편집](#4-논문-뉴스-및-cv-편집)
5. [언어 추가](#5-언어-추가)
6. [대시보드에서 설정하기](#6-대시보드에서-설정하기)
7. [흔한 실수 및 주의사항](#7-흔한-실수-및-주의사항)

---

## 1. 첫 배포: 0에서 라이브까지

**사전 준비:** [Hugo Extended](https://gohugo.io/installation/) 0.146 버전 이상 (테마의 Sass를 컴파일하려면 *Extended* 빌드가 필수입니다). Git, GitHub 계정, 그리고 브라우저 대시보드를 사용할 경우 Python 3가 필요합니다.

1. **템플릿으로 저장소 생성:** GitHub에서 **Use this template → Create a new repository**를 클릭하세요. (또는 클론한 후 `origin`을 본인의 저장소로 연결합니다.)

```bash
   git clone [https://github.com/](https://github.com/)<you>/<repo>.git && cd <repo>
```

2. **개인화:** 설정 스크립트를 실행하면 이름, 소속, 소셜 링크, 팔레트, Pages URL을 설정 파일에 자동으로 업데이트합니다(자세한 내용은 [§2](#2-python-initpy-작동-방식) 참고):

```bash
python init.py
```


3. **로컬 미리보기:** 수정 시 실시간으로 반영됩니다:

```bash
hugo server           # http://localhost:1313/
```


4. **데모 콘텐츠 교체** (예: *Joomo Makguli* 페르소나): 최소 다음 항목을 교체하세요:
* `content/_index.md` - 약력 (언어별 `_index.<lang>.md` 포함)
* `data/<lang>/*.yml` - 논문, 뉴스, CV, 연구 분야
* `static/images/profile.svg` - 본인 사진 (이미지 교체 후 `profileImage` 설정 업데이트)
* `static/cv.pdf` - 이력서 PDF
직접 수정하거나 대시보드를 사용하세요 ([§3](#3-블로그-포스트-작성),
   [§4](#4-논문-뉴스-및-cv-편집)).


5. **커밋 및 `main`으로 푸시:**
```bash
git add -A && git commit -m "chore: personalize template" && git push
```


6. **GitHub Pages 설정 - 브랜치가 아닌 GitHub Actions 사용:** 저장소 설정에서:
**Settings → Pages → Build and deployment → Source: *GitHub Actions*.**
이 템플릿은 Hugo Extended로 빌드하고 `main` 푸시 시 자동으로 배포하는 `.github/workflows/deploy.yml`을 포함합니다. **Actions** 탭에서 진행 상황을 확인하세요. 첫 실행은 1~2분 정도 걸립니다.
> ⚠️ *Deploy from a branch*를 선택하면 GitHub가 존재하지 않는 브랜치를 참조하거나 원본 파일을 그대로 서빙하여 사이트가 깨지거나 404 에러가 발생합니다. 소스는 반드시 **GitHub Actions**여야 합니다. [§7](#7-흔한-실수-및-주의사항)을 참고하세요.



이제 `baseURL`에서 사이트가 운영됩니다 (보통 `https://<you>.github.io/<repo>/`). 이후 `main`에 `git push`할 때마다 자동으로 재배포됩니다.

---

## 2. `python init.py` 작동 방식

`init.py`는 의존성이 없으며 반복 실행 가능한 개인화 도구입니다. `config/_default/hugo.toml`과 `config/_default/params.yaml` 두 파일을 수정하여 사용자 설정값을 변경하며, 기존의 주석, 구조, 언어 목록은 그대로 유지합니다.

저장소 루트에서 실행하세요:

```bash
python init.py
```

각 항목별로 값을 묻습니다. 괄호 안에 현재 값이 표시되며, **Enter를 누르면 기존 값이 유지**됩니다:

| 항목 | 작성 대상 | 비고 |
| --- | --- | --- |
| 사용자 이름 (사이트 제목) | `hugo.toml` `title` | 사이트 제목으로 표시 |
| GitHub 사용자명 | - | URL 제안 시 사용 |
| 저장소 이름 | - | `baseURL` 제안 시 사용 |
| 사이트 baseURL | `hugo.toml` `baseURL` | 기본값 `https://<user>.github.io/<repo>/` |
| 소속/설명 | `params.yaml` `description` | 이름 아래 줄 |
| 태그라인 | `params.yaml` `tagline` | 홈페이지 한 줄 요약 |
| 이메일 | `params.yaml` `email` |  |
| Google Scholar URL | `params.yaml` `googleScholar` |  |
| GitHub URL | `params.yaml` `github` |  |
| LinkedIn URL | `params.yaml` `linkedin` |  |
| 파비콘 이모지 | `params.yaml` `faviconEmoji` | 기본값 🌲 |
| 색상 팔레트 | `params.yaml` `palette` | `forest` / `slate` / `crimson` / `plum` |

이 스크립트는 콘텐츠나 언어 관련 설정에는 영향을 주지 않으므로 언제든 다시 실행하여 특정 값만 변경할 수 있습니다.

---

## 3. 블로그 포스트 작성

포스트는 `content/blog/`에 위치합니다. 기본 언어는 `slug.md`, 번역본은 `slug.<lang>.md` 형식입니다 (예: `welcome.md` + `welcome.ko.md`).

### 대시보드 사용 (권장)

```bash
python cms-server.py     # http://localhost:8787/ 접속
```

1. 우측 상단에서 **콘텐츠 언어**를 선택하세요.
2. **Blog → New post.** 제목, 파일명(slug), 날짜, 태그, 초안 여부, 설명을 입력합니다.
3. **분할 Markdown 에디터**에서 작성하세요 (오른쪽: 소스, 왼쪽: 미리보기).
4. **`Ctrl+V`로 이미지 붙여넣기.** 이미지가 해시 처리되어 `static/images/uploads/`에 업로드되고, 본문에는 `![](/images/uploads/…)` 경로가 삽입됩니다. 클릭 시 확대되는 라이트박스가 적용됩니다.
5. **Save post.** 저장은 변경사항을 스테이징합니다. 작성이 끝나면 내비게이션 바의 **Commit (N)** 버튼을 눌러 변경사항을 하나의 커밋으로 푸시하세요.

### 직접 작성

`content/blog/<slug>.md`를 생성하고 프론트 매터와 본문을 작성하세요:

```markdown
---
title: Welcome
date: 2025-01-01T09:00:00Z
tags:
  - meta
draft: false
description: 첫 번째 포스트입니다.
---

```

초안으로 설정하려면 `draft: true`를 사용하세요.

---

## 4. 논문, 뉴스 및 CV 편집

이 섹션들은 `data/<lang>/` 하위의 **데이터 파일**입니다. 직접 수정하거나 대시보드 편집기를 통해 수정 가능합니다. 언어별로 관리되므로 수정 전 반드시 언어 셀렉터를 확인하세요.

### 논문 (`data/<lang>/publications.yml`)

저자 목록에서 **본인의 이름**은 ``로 감싸서 굵게 표시하세요.

* `type`: 필터 탭으로 사용.
* `selected: true`: 홈페이지 주요 논문 목록에 노출.
* `interest`: 해당 연구 분야 페이지와 자동 연결 (반드시 분야의 `title`과 일치해야 함).

### 뉴스 (`data/<lang>/news.yml`)

최신순으로 자동 정렬됩니다. `text`는 인라인 마크다운 링크를 지원합니다.

### CV (`data/<lang>/cv.yml`)

`education`, `awards`, `service`, `teaching` 4개 섹션을 지원합니다. 다운로드 가능한 PDF는 `static/cv.pdf`입니다.

---

## 5. 언어 추가

1. `config/_default/hugo.toml`의 `[languages]`에 언어 블록을 추가합니다.
2. `i18n/en.toml`을 복사하여 `i18n/<lang>.toml`로 번역합니다.
3. `data/<lang>/`을 생성하고 데이터를 번역합니다. **`title` 키는 변경하지 마세요.**
4. 콘텐츠 파일(예: `_index.<lang>.md`)과 `_content.<lang>.gotmpl`을 생성합니다.
5. `static/admin/admin.js`의 `LANGS` 배열에 해당 언어를 추가합니다.

---

## 6. 대시보드에서 설정하기

대시보드의 **Settings** 탭에서 `params.yaml`을 직접 수정하지 않고도 사이트의 소셜 정보, 색상 팔레트, 섹션 활성화 여부를 관리할 수 있습니다.

* **참고:** 저장 시 `params.yaml`의 주석은 사라집니다. 이름/사이트 제목, `baseURL`, 언어 목록은 `hugo.toml`을 직접 수정해야 합니다.

---

## 7. 흔한 실수 및 주의사항

* **GitHub Actions로 배포:** Pages 설정의 Source는 반드시 *GitHub Actions*여야 합니다.
* **`baseURL` 설정:** 프로젝트 사이트의 경우 `https://<you>.github.io/<repo>/` 형식이어야 하며 마지막 슬래시(`/`)가 필수입니다.
* **Hugo Extended 사용:** 테마 컴파일을 위해 필수입니다.
* **타이틀 키 유지:** `title` 키를 언어별로 다르게 하면 크로스 링크가 깨집니다. 반드시 동일하게 유지하세요.
* **브라우저 호환성:** CSS 상대 색상 구문을 사용하므로 최신 브라우저가 필요합니다.