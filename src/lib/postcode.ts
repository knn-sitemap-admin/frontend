declare global {
  interface Window {
    daum: any;
    kakao: any;
  }
}

let scriptLoaded = false;

export type PostcodeResult = {
  address: string;
  lat: number;
  lng: number;
};

function loadPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject("Window is undefined");
    if (scriptLoaded || window.daum?.Postcode) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Daum Postcode script"));
    document.head.appendChild(script);
  });
}

export async function openPostcodePopup(): Promise<PostcodeResult | null> {
  try {
    await loadPostcodeScript();
  } catch (err) {
    console.error(err);
    alert("주소 검색 라이브러리를 불러오지 못했습니다.");
    return null;
  }

  return new Promise((resolve) => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.
        // 도로명 주소의 노출 규칙에 따라 주소를 조합한다.
        // 내려오는 변수가 값이 없는 경우엔 공백('')값을 가지므로, 이를 참고하여 분기 한다.
        const roadAddr = data.roadAddress; // 도로명 주소 변수
        let extraRoadAddr = ""; // 참고 항목 변수

        // 법정동명이 있을 경우 추가한다. (법정리는 제외)
        // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다.
        if (data.bname !== "" && /[동|로|가]$/g.test(data.bname)) {
          extraRoadAddr += data.bname;
        }
        // 건물명이 있고, 공동주택일 경우 추가한다.
        if (data.buildingName !== "" && data.apartment === "Y") {
          extraRoadAddr +=
            extraRoadAddr !== "" ? ", " + data.buildingName : data.buildingName;
        }
        // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
        if (extraRoadAddr !== "") {
          extraRoadAddr = " (" + extraRoadAddr + ")";
        }

        // 1차 결과 주소
        const fullAddr = roadAddr + extraRoadAddr;

        // 2단계: 카카오 Geocoder로 위경도 좌표 얻어오기
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(roadAddr, function (results: any, status: any) {
            if (status === window.kakao.maps.services.Status.OK && results?.[0]) {
              resolve({
                address: fullAddr,
                lat: Number(results[0].y),
                lng: Number(results[0].x),
              });
            } else {
              // 도로명으로 못 찾을 경우 지번 주소로 재검색 시도
              geocoder.addressSearch(
                data.jibunAddress,
                function (res2: any, status2: any) {
                  if (status2 === window.kakao.maps.services.Status.OK && res2?.[0]) {
                    resolve({
                      address: fullAddr,
                      lat: Number(res2[0].y),
                      lng: Number(res2[0].x),
                    });
                  } else {
                    // 결국 못 찾은 경우 주소만 넘긴다 (좌표는 0 처리나 예외 핸들 필요할 수 있으나 보통 찾음)
                    alert("주소지의 좌표를 찾을 수 없습니다.");
                    resolve(null);
                  }
                }
              );
            }
          });
        } else {
          alert("카카오 지도 라이브러리가 준비되지 않았습니다.");
          resolve(null);
        }
      },
      onclose: function (state: any) {
        if (state === "FORCE_CLOSE") {
          resolve(null);
        }
      },
    }).open();
  });
}
