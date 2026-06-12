# Academic Portfolio: 연구자를 위한 노코드 Hugo 템플릿

[English](/README.md) · 한국어

연구자로서의 모든 것을 한곳에 담는, 깔끔하고 전문적인 웹사이트입니다. 약력, 논문, 연구 분야, 뉴스, 이력서(CV), 블로그까지 한 사이트에 모입니다. 코드를 작성하거나 기술적인 내용을 배울 필요 없이, 브라우저의 간단한 편집기로 직접 내용을 채우고 무료로 온라인에 게시할 수 있습니다. 영어와 한국어를 시작으로 여러 언어를 기본 지원하며, 각 언어가 똑같이 정성껏 표현됩니다. 휴대폰과 노트북 어디서나 보기 좋게 표시되고, 차분하고 종이 같은 디자인이 웹사이트가 아니라 연구 자체에 시선이 머물도록 합니다.

**[▶ 라이브 데모](https://2ood.github.io/hugo-academic-portfolio/)**  · 
MIT 라이선스  ·  정적 사이트, GitHub Pages 무료 호스팅

![](static/images/screenshot_front.png)

## 이 템플릿을 선택해야 하는 이유

* **유지보수 제로: 템플릿 코드 수정 없이 설정 가능.** 사이트 정보, 소셜 링크, 색상 팔레트, 섹션 구성 등을 하나의 YAML 파일에서 관리합니다. 직접 수정하거나 대시보드를 통해 변경할 수 있어 프론트엔드 지식이 전혀 필요 없습니다.
* **네이티브 모바일 지원: 반응형 레이아웃.** 작은 화면에서도 콘텐츠가 깔끔하게 보입니다.
* **기본 다국어 지원.** 영어 + 한국어 데모가 포함되어 있으며, 언어 전환 드롭다운, 언어별 콘텐츠 및 UI 문자열을 지원합니다. 설정에서 간편하게 언어를 추가하거나 삭제할 수 있습니다.
* **무료 호스팅.** GitHub Actions를 통해 `main` 브랜치에 푸시할 때마다 최적화된 정적 파일이 GitHub Pages로 자동 배포됩니다.
* **브라우저 콘텐츠 대시보드.** 논문, 뉴스, 이력서, 연구 분야를 위한 스키마 기반 편집기를 제공하며, 이미지 붙여넣기(paste-to-upload)를 지원하는 Markdown 에디터를 포함합니다. 작업 내용은 로컬 저장소에 깔끔한 단일 커밋으로 반영됩니다.
* **의존성 최소화.** Hugo 바이너리만으로 빌드됩니다. Node, 번들러, PostCSS 등이 필요 없습니다. 선택 사항인 콘텐츠 에디터는 의존성이 없는 단일 Python 파일입니다.
* **라이트/다크 모드 및 색상 팔레트.** 방문자가 브라우저 설정을 따르거나 직접 전환할 수 있으며, 로딩 시 깜빡임이 없습니다. CSS 커스텀 속성을 사용한 4가지 팔레트를 지원합니다.


## 구성 요소

| 섹션 | 설명 |
| --- | --- |
| **홈** | 프로필, 약력, 태그라인, *주요 논문(Selected Publications)* 목록 |
| **연구 분야** | 테마별 연구 분야, 요약 및 관련 논문을 자동으로 나열하는 전용 페이지 |
| **논문** | 필터링 가능한 목록(학회/워크샵/저널/프리프린트), 논문/코드/데이터/프로젝트 링크 및 수상 경력 포함 |
| **뉴스** | 날짜 및 이모지 태그가 포함된 공지사항 |
| **이력서(CV)** | 학력, 수상, 학술 활동, 강의 경력 및 다운로드 가능한 PDF |
| **블로그** | 태그, 초안, 언어별 연결(siblings), 이미지 라이트박스가 포함된 Markdown 포스트 |

각 섹션은 설정에서 끄고 켤 수 있으며, 모든 섹션이 다국어를 지원합니다.

## 퀵스타트 (약 5분 소요)

**사전 준비:** [Hugo Extended](https://gohugo.io/installation/) 0.146 버전 이상 (콘텐츠 어댑터 + 기본 Sass 지원). 브라우저 대시보드를 사용하려면 Python 3가 필요합니다. 테마가 CSS 상대 색상 구문을 사용하므로 2023년 이후의 최신 브라우저가 필요합니다.

1. **템플릿 가져오기** - GitHub에서 *Use this template*을 클릭하거나 클론하세요:

```bash
git clone  && cd 
```

2. **개인화** - `init.py` 스크립트를 실행하면 `hugo.toml`과 `params.yaml`을 자동으로 업데이트합니다(이름, 소속, 링크, 팔레트 등). 주석이나 기존 설정은 유지됩니다:

```bash
python init.py
```

직접 수정하고 싶다면 이 과정을 건너뛰고 [사용자 맞춤 설정](#사용자-맞춤-설정-make-it-yours)을 확인하세요.

3. **미리보기** - 수정 시 실시간으로 반영됩니다:

```bash
hugo server      # http://localhost:1313/
```

4. **콘텐츠 추가** - Markdown/YAML을 직접 수정하거나 대시보드를 사용하세요:

```bash
python cms-server.py   # http://localhost:8787/ 접속
```

   `content/_index.md`의 데모 약력, `data/en/*.yml`의 데이터, `static/images/profile.svg`, `static/cv.pdf`를 본인의 것으로 교체하세요.

5. **배포** - `baseURL`을 GitHub Pages 주소로 설정한 후 푸시하세요. GitHub Actions가 자동으로 빌드 및 배포합니다:

```bash
git push origin main
```

결과: `https://<you>.github.io/<repo>/`에서 나만의 학술 사이트를 확인할 수 있습니다.

> 📖 상세 가이드가 필요하신가요? **[QUICKSTART.md](/QUICKSTART.ko.md)**에서 첫 배포, 포스트 작성, 논문/뉴스/CV 편집, 언어 추가 등 상세한 단계를 확인할 수 있습니다.

## 사용자 맞춤 설정 (Make it yours)

수동으로 설정하거나 `init.py`가 제공하는 범위를 넘어서는 커스터마이징을 원할 경우 다음 단계를 따르세요:

1. **정보 및 구조** - `config/_default/hugo.toml`에서 `baseURL`, `title`(사용자 이름), 언어 목록을 설정합니다. `config/_default/params.yaml`에서 `description`, `tagline`, 소셜 링크, `palette` 및 각 섹션 활성화 여부를 설정합니다.
2. **콘텐츠** - `data/<lang>/*.yml`의 데모 데이터(논문, 뉴스, 이력서, 연구 분야), `content/_index.md`의 약력, `content/blog/`의 데모 게시물을 본인의 콘텐츠로 교체합니다. `static/images/profile.svg`와 `static/cv.pdf`도 본인의 파일로 변경하세요.
3. **미리보기 및 배포** - `hugo server`로 미리 확인한 후, `main` 브랜치에 푸시하여 배포합니다.

### 설정 참조 (`config/_default/params.yaml`)

| 키 | 설명 |
| --- | --- |
| `description` | 이름 아래 표시되는 소속 문구 |
| `tagline` | 홈페이지에 표시되는 한 줄 요약 |
| `faviconEmoji` | 파비콘으로 사용할 이모지 (기본값: 🌲) |
| `profileImage` | `static/` 폴더 내 프로필 이미지 경로 |
| `email`, `googleScholar`, `github`, `linkedin` | 소셜 링크 |
| `cvPdf` | `static/` 폴더 내 이력서 PDF 파일 경로 |
| `palette` | `forest`, `slate`, `crimson`, `plum` 중 선택 (참고: `assets/scss/_theme.scss`) |
| `sections` | 섹션별 활성화 여부: `research`, `publications`, `blog`, `news`, `cv` |

언어별 `description`/`tagline` 오버라이드는 `config/_default/hugo.toml` 내 `[languages.<lang>.params]` 섹션에서 설정합니다.

### 언어 추가하기

1. `config/_default/hugo.toml`에 `[languages.<lang>]` 블록을 추가합니다.
2. `i18n/en.toml`을 `i18n/<lang>.toml`로 복사하고 값을 번역합니다.
3. `data/<lang>/*.yml`을 생성합니다 (`data/en/`에서 복사; 슬러그와 크로스 링크 유지를 위해 `title` 키는 그대로 두고 내용만 번역하세요).
4. `<name>.<lang>.md` 파일(예: `_index.<lang>.md`)과 논문/연구 분야 섹션을 위한 `_content.<lang>.gotmpl` 파일을 추가합니다.
5. 대시보드에서 해당 언어를 편집할 수 있도록 `static/admin/admin.js`의 `LANGS`를 업데이트합니다.

### 색상 및 테마

팔레트는 `assets/scss/_theme.scss` 내 CSS 커스텀 속성 세트로 정의됩니다. 설정된 `palette`는 `<html>` 태그의 `data-palette` 속성을 설정하며, 방문자의 라이트/다크 모드 선택은 `data-theme` 속성으로 제어됩니다. 새로운 팔레트를 추가하려면 `[data-palette="이름"]` 블록을 추가하고 `static/admin/admin.js`의 `PALETTES` 목록에 이름을 추가하세요.

기본 제공 옵션은 다음과 같습니다:

|Forest|Slate|
|-----|-----|
| ![](static/images/screenshot_forest.png) | ![](static/images/screenshot_slate.png) |

|Crimson|Plum|
|-----|-----|
| ![](static/images/screenshot_crimson.png) | ![](static/images/screenshot_plum.png) |

---

## 콘텐츠 대시보드 (`/admin/`)

콘텐츠를 수정하는 두 가지 방법:

1. **직접 편집** - Markdown/YAML 파일을 직접 수정하고 커밋합니다.
2. **대시보드** - Python 기반의 로컬 서버를 통해 편집하고 저장하면, 변경 사항을 한 번에 모아서 하나의 커밋으로 푸시할 수 있습니다.

```bash
python cms-server.py     # http://localhost:8787/ 접속
```

*   **자동 번역 지원**: 편집기 내의 **⤳ Translate from …** 버튼을 누르면 다른 언어의 내용을 기반으로 초안을 작성할 수 있습니다(MyMemory 서비스 활용).
*   **GitHub 배포 시**: GitHub API 토큰을 사용하여 웹 브라우저 상에서도 바로 커밋할 수 있습니다.

## 프로젝트 구조

*   `config/_default/`: 설정 파일 (구조 및 파라미터)
*   `content/`: Markdown 페이지 및 포스트
*   `data/<lang>/`: 언어별 구조화된 데이터 (논문, 뉴스 등)
*   `i18n/`: UI 문자열 번역 파일
*   `layouts/`: Hugo 템플릿 파일
*   `assets/`: SCSS 스타일시트 및 JS 파일
*   `static/`: 이미지 및 대시보드 파일

## 라이선스

[MIT](LICENSE). 이 템플릿을 사용하여 사이트를 만드셨다면 출처를 남겨주시면 감사하지만, 필수는 아닙니다.
