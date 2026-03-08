// 숫자에 천 단위 구분자 추가하는 함수
export const formatNumberWithCommas = (value: string): string => {
  // 숫자가 아닌 문자 제거
  const numericValue = value.replace(/[^0-9]/g, "");
  if (numericValue === "") return "";

  // 천 단위 구분자 추가
  return Number(numericValue).toLocaleString();
};

// 숫자를 한국어 단위로 변환하는 함수
export const formatKoreanCurrency = (value: string): string => {
  const num = Number(value.replace(/,/g, ""));
  if (isNaN(num) || num === 0) return "";

  let result = "";

  // 억 단위
  if (num >= 100000000) {
    const billion = Math.floor(num / 100000000);
    result += `${billion}억`;
    const remainder = num % 100000000;
    if (remainder > 0) {
      result += " ";
      if (remainder >= 10000) {
        const million = Math.floor(remainder / 10000);
        result += `${million}만`;
        const thousandRemainder = remainder % 10000;
        if (thousandRemainder > 0) {
          result += " ";
          if (thousandRemainder >= 1000) {
            const thousand = Math.floor(thousandRemainder / 1000);
            result += `${thousand}천`;
            const hundredRemainder = thousandRemainder % 1000;
            if (hundredRemainder > 0) {
              result += " ";
              if (hundredRemainder >= 100) {
                const hundred = Math.floor(hundredRemainder / 100);
                result += `${hundred}백`;
                const tenRemainder = hundredRemainder % 100;
                if (tenRemainder > 0) {
                  result += " ";
                  if (tenRemainder >= 10) {
                    const ten = Math.floor(tenRemainder / 10);
                    result += `${ten}십`;
                    const one = tenRemainder % 10;
                    if (one > 0) {
                      result += ` ${one}`;
                    }
                  } else {
                    result += `${tenRemainder}`;
                  }
                }
              } else if (hundredRemainder >= 10) {
                const ten = Math.floor(hundredRemainder / 10);
                result += `${ten}십`;
                const one = hundredRemainder % 10;
                if (one > 0) {
                  result += ` ${one}`;
                }
              } else {
                result += `${hundredRemainder}`;
              }
            }
          } else if (thousandRemainder >= 100) {
            const hundred = Math.floor(thousandRemainder / 100);
            result += `${hundred}백`;
            const tenRemainder = thousandRemainder % 100;
            if (tenRemainder > 0) {
              result += " ";
              if (tenRemainder >= 10) {
                const ten = Math.floor(tenRemainder / 10);
                result += `${ten}십`;
                const one = tenRemainder % 10;
                if (one > 0) {
                  result += ` ${one}`;
                }
              } else {
                result += `${tenRemainder}`;
              }
            }
          } else if (thousandRemainder >= 10) {
            const ten = Math.floor(thousandRemainder / 10);
            result += `${ten}십`;
            const one = thousandRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${thousandRemainder}`;
          }
        }
      } else if (remainder >= 1000) {
        const thousand = Math.floor(remainder / 1000);
        result += `${thousand}천`;
        const hundredRemainder = remainder % 1000;
        if (hundredRemainder > 0) {
          result += " ";
          if (hundredRemainder >= 100) {
            const hundred = Math.floor(hundredRemainder / 100);
            result += `${hundred}백`;
            const tenRemainder = hundredRemainder % 100;
            if (tenRemainder > 0) {
              result += " ";
              if (tenRemainder >= 10) {
                const ten = Math.floor(tenRemainder / 10);
                result += `${ten}십`;
                const one = tenRemainder % 10;
                if (one > 0) {
                  result += ` ${one}`;
                }
              } else {
                result += `${tenRemainder}`;
              }
            }
          } else if (hundredRemainder >= 10) {
            const ten = Math.floor(hundredRemainder / 10);
            result += `${ten}십`;
            const one = hundredRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${hundredRemainder}`;
          }
        }
      } else if (remainder >= 100) {
        const hundred = Math.floor(remainder / 100);
        result += `${hundred}백`;
        const tenRemainder = remainder % 100;
        if (tenRemainder > 0) {
          result += " ";
          if (tenRemainder >= 10) {
            const ten = Math.floor(tenRemainder / 10);
            result += `${ten}십`;
            const one = tenRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${tenRemainder}`;
          }
        }
      } else if (remainder >= 10) {
        const ten = Math.floor(remainder / 10);
        result += `${ten}십`;
        const one = remainder % 10;
        if (one > 0) {
          result += ` ${one}`;
        }
      } else {
        result += `${remainder}`;
      }
    }
  } else if (num >= 10000) {
    // 만 단위
    const million = Math.floor(num / 10000);
    result += `${million}만`;
    const remainder = num % 10000;
    if (remainder > 0) {
      result += " ";
      if (remainder >= 1000) {
        const thousand = Math.floor(remainder / 1000);
        result += `${thousand}천`;
        const hundredRemainder = remainder % 1000;
        if (hundredRemainder > 0) {
          result += " ";
          if (hundredRemainder >= 100) {
            const hundred = Math.floor(hundredRemainder / 100);
            result += `${hundred}백`;
            const tenRemainder = hundredRemainder % 100;
            if (tenRemainder > 0) {
              result += " ";
              if (tenRemainder >= 10) {
                const ten = Math.floor(tenRemainder / 10);
                result += `${ten}십`;
                const one = tenRemainder % 10;
                if (one > 0) {
                  result += ` ${one}`;
                }
              } else {
                result += `${tenRemainder}`;
              }
            }
          } else if (hundredRemainder >= 10) {
            const ten = Math.floor(hundredRemainder / 10);
            result += `${ten}십`;
            const one = hundredRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${hundredRemainder}`;
          }
        }
      } else if (remainder >= 100) {
        const hundred = Math.floor(remainder / 100);
        result += `${hundred}백`;
        const tenRemainder = remainder % 100;
        if (tenRemainder > 0) {
          result += " ";
          if (tenRemainder >= 10) {
            const ten = Math.floor(tenRemainder / 10);
            result += `${ten}십`;
            const one = tenRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${tenRemainder}`;
          }
        }
      } else if (remainder >= 10) {
        const ten = Math.floor(remainder / 10);
        result += `${ten}십`;
        const one = remainder % 10;
        if (one > 0) {
          result += ` ${one}`;
        }
      } else {
        result += `${remainder}`;
      }
    }
  } else if (num >= 1000) {
    // 천 단위
    const thousand = Math.floor(num / 1000);
    result += `${thousand}천`;
    const remainder = num % 1000;
    if (remainder > 0) {
      result += " ";
      if (remainder >= 100) {
        const hundred = Math.floor(remainder / 100);
        result += `${hundred}백`;
        const tenRemainder = remainder % 100;
        if (tenRemainder > 0) {
          result += " ";
          if (tenRemainder >= 10) {
            const ten = Math.floor(tenRemainder / 10);
            result += `${ten}십`;
            const one = tenRemainder % 10;
            if (one > 0) {
              result += ` ${one}`;
            }
          } else {
            result += `${tenRemainder}`;
          }
        }
      } else if (remainder >= 10) {
        const ten = Math.floor(remainder / 10);
        result += `${ten}십`;
        const one = remainder % 10;
        if (one > 0) {
          result += ` ${one}`;
        }
      } else {
        result += `${remainder}`;
      }
    }
  } else if (num >= 100) {
    // 백 단위
    const hundred = Math.floor(num / 100);
    result += `${hundred}백`;
    const remainder = num % 100;
    if (remainder > 0) {
      result += " ";
      if (remainder >= 10) {
        const ten = Math.floor(remainder / 10);
        result += `${ten}십`;
        const one = remainder % 10;
        if (one > 0) {
          result += ` ${one}`;
        }
      } else {
        result += `${remainder}`;
      }
    }
  } else if (num >= 10) {
    // 십 단위
    const ten = Math.floor(num / 10);
    result += `${ten}십`;
    const one = num % 10;
    if (one > 0) {
      result += ` ${one}`;
    }
  } else {
    // 일 단위
    result += `${num}`;
  }

  result += "원";
  return result;
};

// 평수를 제곱미터로 변환하는 함수 (1평 = 3.3058㎡)
export const convertPyeongToSquareMeter = (pyeong: string): string => {
  const num = Number(pyeong.replace(/,/g, ""));
  if (isNaN(num) || num === 0) return "0";

  const squareMeter = num * 3.3058;
  return squareMeter.toFixed(1);
};

// 매매가 입력값을 원 단위로 변환하는 함수 (200 → 200,000,000)
export const convertPriceToWon = (input: string): string => {
  const num = Number(input.replace(/,/g, ""));
  if (isNaN(num) || num === 0) return "0";

  // 만원 단위를 원 단위로 변환 (예: 200 → 2,000,000)
  return (num * 10000).toString();
};

// 매매가 입력값(백만원 단위)을 원 단위로 변환하는 함수 (200 → 200,000,000)
// DB는 백만원 단위로 저장하므로 필터 라벨 표시 시 이 함수를 사용
export const convertSalePriceToWon = (input: string): string => {
  const num = Number(input.replace(/,/g, ""));
  if (isNaN(num) || num === 0) return "0";

  // 백만원 단위를 원 단위로 변환 (예: 200 → 200,000,000)
  return (num * 1_000_000).toString();
};
