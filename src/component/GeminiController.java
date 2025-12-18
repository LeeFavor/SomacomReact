package com.kosta.somacom.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.kosta.somacom.dto.response.ChatResponse;

@RestController
@RequestMapping("/api")
public class GeminiController {

    @Value("${google.gemini.api-key}")
    private String apiKey;

    @Value("${google.gemini.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    // 챗봇에게 부여할 역할(Persona)과 규칙 정의
    private static final String SYSTEM_PROMPT = 
            "You are the AI assistant for SOMACOM, a specialized PC parts online store.\n" +
            "Your role is to assist customers in choosing PC components, checking compatibility, and navigating the website.\n" +
            "\n" +
            "URL GENERATION MODE (STRICT):\n" +
            "You MUST use the following templates to generate links. Do NOT create raw URLs.\n" +
            "1. Navigation: `[[NAV | url=/path | label=Link Text]]` (For static pages like /cart, /mypage)\n" +
            "2. Search: `[[SEARCH | param1=value1 | ... | label=Link Text]]` (For product searches)\n" +
            "\n" +
            "SEARCH PARAMETER RULES:\n" +
            "1. Supported Parameters: `category`, `keyword`, `compatFilter`, `filters[KEY]`.\n" +
            "2. VALID FILTERS (`filters[KEY]`): ONLY use the filters listed below for each category.\n" +
            "   - CPU: `socket`, `supportedMemoryTypes`\n" +
            "   - Motherboard: `chipset`, `memoryType`, `formFactor`\n" + // 'socket' is NOT a valid filter for Motherboard.
            "   - GPU: `pcieVersion`\n" +
            "   - RAM: `memoryType`, `speedMhz`\n" +
            "3. INVALID FILTER HANDLING: If a user asks for a filter that is not valid for a category (e.g., 'Motherboard with socket AM5'), you MUST NOT add the invalid filter. Politely inform the user and provide a search link without the invalid filter.\n" +
            "4. Brand/Manufacturer: Use the `keyword` parameter for brand names (e.g., `keyword=ASUS`). NEVER use `filters[manufacturer]` or `filters[brand]`.\n" +
            "\n" +
            "SITE NAVIGATION & INTENT MAPPING:\n" +
            "- '비밀번호 변경', '회원정보 수정' -> `[[NAV | url=/mypage | label=마이페이지로 이동]]`\n" +
            "- '장바구니' -> `[[NAV | url=/cart | label=장바구니 보기]]`\n" +
            "- '주문 기록' -> `[[NAV | url=/mypage | label=주문 기록 보기]]`\n" +
            "\n" +
            "COMPATIBILITY RULES:\n" +
            "1. For compatibility checks, add `compatFilter=true` to the SEARCH template.\n" +
            "2. If category is unspecified, suggest links for: Motherboard, CPU, GPU, RAM.\n" +
            "\n" +
            "RESTRICTIONS:\n" +
            "- DO NOT provide links to Admin or Seller pages.\n" +
            "\n" +
            "EXAMPLES:\n" +
            "- User: 'DDR5 CPU 보여줘' -> `[[SEARCH | category=CPU | filters[supportedMemoryTypes]=DDR5 | label=DDR5 CPU 목록]]`\n" +
            "- User: '호환되는 보드 보여줘' -> `[[SEARCH | category=Motherboard | compatFilter=true | label=호환되는 메인보드 목록]]`\n" +
            "- User: 'AM5 소켓을 쓰는 호환 보드' (Incorrect) -> '메인보드는 소켓으로 필터링할 수 없습니다. 대신 호환되는 모든 메인보드를 찾아드릴게요. [[SEARCH | category=Motherboard | compatFilter=true | label=호환되는 메인보드 목록]]'\n" +
             "\n" +  
            "Response language: Korean.\n" +
            "Current User Question: ";

    public GeminiController() {
        this.restTemplate = new RestTemplate();
    }

    @GetMapping("/gemini/models")
    public ResponseEntity<?> listModels() {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error listing models: " + e.getMessage());
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {
        try {
            // 1. Google Gemini API 요청 URL 완성 (Query Param으로 키 전달)
            // 무료 모델인 gemini-2.5-flash-lite 사용을 위해 URL 직접 지정
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + apiKey;

            // 2. 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 3. 요청 바디 구성 (Google API 규격에 맞춤)
            // JSON 구조: { "contents": [{ "parts": [{ "text": "사용자 질문" }] }] }
            Map<String, Object> part = new HashMap<>();
            // 시스템 프롬프트와 사용자 질문을 결합하여 전송
            part.put("text", SYSTEM_PROMPT + request.get("message"));

            Map<String, Object> content = new HashMap<>();
            content.put("parts", Collections.singletonList(part));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", Collections.singletonList(content));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 4. API 호출
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            // 5. 응답 파싱 (복잡한 JSON 구조에서 텍스트 추출)
            // 구조: candidates[0] -> content -> parts[0] -> text
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && responseBody.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    String answer = (String) parts.get(0).get("text");

                    // 템플릿([[SEARCH | ...]])을 실제 URL로 변환
                    String processedAnswer = processGeminiResponse(answer);
                    return ResponseEntity.ok(new ChatResponse(processedAnswer));
                }
            }

            return ResponseEntity.ok(new ChatResponse("응답을 생성하지 못했습니다."));

        } catch (HttpClientErrorException e) {
            e.printStackTrace();
            return ResponseEntity.status(e.getStatusCode()).body("Google API Error: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal Server Error");
        }
    }

    /**
     * Gemini가 생성한 템플릿 태그를 실제 Markdown 링크로 변환합니다.
     * 예: [[SEARCH | category=CPU | label=CPU보기]] -> CPU보기
     */
    private String processGeminiResponse(String text) {
        // 정규식: [[TYPE | ... ]] 패턴 찾기 (SEARCH 또는 NAV)
        Pattern pattern = Pattern.compile("\\[\\[(SEARCH|NAV)\\s*\\|\\s*(.*?)\\]\\]");
        Matcher matcher = pattern.matcher(text);

        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String type = matcher.group(1);
            String paramsPart = matcher.group(2);
            String[] params = paramsPart.split("\\|");
            
            String label = "검색 결과 보기"; // 기본 라벨
            String finalUrl = "#";

            if ("SEARCH".equals(type)) {
                List<String> queryParams = new ArrayList<>();
                for (String param : params) {
                    String[] kv = param.split("=", 2);
                    if (kv.length == 2) {
                        String key = kv[0].trim();
                        String value = kv[1].trim();
                        if ("label".equalsIgnoreCase(key)) {
                            label = value;
                        } else {
                            try {
                                String encodedKey = URLEncoder.encode(key, StandardCharsets.UTF_8.toString());
                                String encodedValue = URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
                                queryParams.add(encodedKey + "=" + encodedValue);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
                }
                finalUrl = "/search?" + String.join("&", queryParams);
            } else if ("NAV".equals(type)) {
                for (String param : params) {
                    String[] kv = param.split("=", 2);
                    if (kv.length == 2) {
                        String key = kv[0].trim();
                        String value = kv[1].trim();
                        if ("label".equalsIgnoreCase(key)) label = value;
                        else if ("url".equalsIgnoreCase(key)) finalUrl = value;
                    }
                }
            }
            
            // Markdown 링크 생성: Label
            matcher.appendReplacement(sb, Matcher.quoteReplacement("[" + label + "](" + finalUrl + ")"));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}