package app

import (
	"net/url"
	"strings"
	"testing"
)

func TestInputLimits(t *testing.T) {
	for _, q := range []string{"page=0", "page_size=49", "min=-1", "min=200&max=100", "sort=unknown", "platform=bogus", "page=2147483648", "q=" + strings.Repeat("x", 81)} {
		v, _ := url.ParseQuery(q)
		if _, e := parseFilters(v); e == nil {
			t.Errorf("accepted %s", q)
		}
	}
	v, _ := url.ParseQuery("q=Cyber&platform=Steam&region=Europe&min=100&max=4000&sort=price_desc&page=2")
	f, e := parseFilters(v)
	if e != nil || f.Q != "cyber" || f.Page != 2 || f.Max != 4000 {
		t.Fatalf("combined filters: %+v %v", f, e)
	}
}
func TestCheckoutInput(t *testing.T) {
	tests := []CheckoutRequest{{nil, "success"}, {[]CartItem{{11, 0, 799}}, "success"}, {[]CartItem{{11, 6, 799}}, "success"}, {[]CartItem{{11, 1, 799}, {11, 2, 799}}, "success"}, {[]CartItem{{11, 1, 0}}, "success"}, {[]CartItem{{11, 1, 799}}, "real"}}
	for _, c := range tests {
		if normalize(&c) {
			t.Fatalf("invalid checkout accepted: %+v", c)
		}
	}
	valid := CheckoutRequest{[]CartItem{{22, 1, 1000}, {11, 2, 799}}, "success"}
	if !normalize(&valid) || valid.Items[0].OfferID != 11 {
		t.Fatal("canonical sort failed")
	}
}
func TestPasswordBytePolicy(t *testing.T) {
	for _, password := range []string{"short", strings.Repeat("é", 37), strings.Repeat("a", 73)} {
		if credentialsValid(&credentials{"test@example.com", password}) {
			t.Fatal("invalid byte length accepted")
		}
	}
	if !credentialsValid(&credentials{" TEST@EXAMPLE.COM ", strings.Repeat("é", 36)}) {
		t.Fatal("valid 72-byte password rejected")
	}
}
func TestFallbackDistance(t *testing.T) {
	if distance("elden ring", "eldn ring") != 1 || distance("cyberpunk", "cyberpunk") != 0 {
		t.Fatal("edit distance is wrong")
	}
}
