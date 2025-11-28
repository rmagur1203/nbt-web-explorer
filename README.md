# NBT Web Explorer

Minecraft NBT 파일을 웹 브라우저에서 보고 편집할 수 있는 클라이언트 사이드 에디터입니다.

## 기능

### NBT 파일 에디터 (메인 페이지)
- **NBT 파일 읽기**: .dat, .nbt, .schematic 등 다양한 NBT 파일 형식 지원
- **Region 파일 지원**: .mcr, .mca (Minecraft Anvil/Region) 파일 읽기
- **압축 자동 감지**: GZip, Zlib, 비압축 NBT 자동 인식
- **트리 뷰어**: 계층적 NBT 구조를 트리 형태로 표시
- **태그 편집**: 모든 NBT 태그 타입 편집 지원
- **태그 추가/삭제**: Compound와 List에 새 태그 추가 및 삭제
- **파일 저장**: 수정된 NBT 파일 다운로드
- **복사/붙여넣기**: 태그 복사, 잘라내기, 붙여넣기

### MCA 3D 청크 뷰어 (`/mca`)
- **Region 미니맵**: 전체 Region의 청크 분포 시각화
- **3D 블록 렌더링**: 선택한 청크의 블록을 3D로 표시
- **Y 슬라이스**: 특정 높이까지만 표시하는 슬라이더
- **카메라 컨트롤**: 마우스 드래그로 회전, 스크롤로 줌
- **다중 청크 선택**: Ctrl/Cmd+클릭으로 여러 청크 선택

## 지원 NBT 태그 타입

| 타입 | 설명 |
|------|------|
| Byte | 8비트 정수 (-128 ~ 127) |
| Short | 16비트 정수 (-32,768 ~ 32,767) |
| Int | 32비트 정수 |
| Long | 64비트 정수 |
| Float | 32비트 부동소수점 |
| Double | 64비트 부동소수점 |
| String | 문자열 |
| Byte Array | 바이트 배열 |
| Int Array | 정수 배열 |
| Long Array | Long 배열 |
| List | 같은 타입의 태그 리스트 |
| Compound | 이름이 있는 태그들의 컬렉션 |

## 설치

```bash
pnpm install
```

## 개발 서버 실행

```bash
pnpm dev
```

## 빌드

```bash
pnpm build
```

## 사용법

### NBT 에디터
1. 웹 브라우저에서 http://localhost:3000 접속
2. NBT 파일을 드래그앤드롭하거나 클릭하여 파일 선택
3. 트리 뷰에서 태그를 클릭하여 선택
4. 더블클릭 또는 우클릭 메뉴로 값 편집
5. 수정 후 저장 버튼 클릭하여 파일 다운로드

### MCA 3D 뷰어
1. 메인 페이지에서 "MCA 3D 뷰어" 버튼 클릭 또는 `/mca` 접속
2. MCA 파일을 드래그앤드롭하거나 "MCA 파일 열기" 클릭
3. 좌측 미니맵에서 보고 싶은 청크 클릭 (Ctrl+클릭으로 다중 선택)
4. Y 슬라이더로 표시할 높이 조절
5. 3D 뷰에서 마우스 드래그로 회전, 스크롤로 줌

## 키보드 단축키

- `Enter`: 선택된 태그 편집 저장
- `Escape`: 편집 취소

## 기술 스택

- [Next.js 15](https://nextjs.org/) - React 프레임워크
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트
- [prismarine-nbt](https://github.com/PrismarineJS/prismarine-nbt) - NBT 파싱 라이브러리
- [pako](https://github.com/nodeca/pako) - GZip/Zlib 압축
- [Tailwind CSS](https://tailwindcss.com/) - 스타일링

## 제한사항

- Region 파일은 읽기 전용입니다 (저장 불가)
- 대용량 파일은 로딩 시간이 길 수 있습니다
- MCA 뷰어는 많은 청크 선택 시 성능 저하 가능
- Minecraft 1.12 이하 청크 형식에 최적화됨 (1.13+ 팔레트 형식은 부분 지원)

## 라이선스

MIT License

