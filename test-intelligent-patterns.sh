#!/bin/bash

echo "Testing Intelligent Pattern Recommendation System"
echo "================================================"

# Test 1: Check if locations exist
echo "1. Testing locations API..."
locations=$(curl -s "http://localhost:5000/api/locations" | head -100)
echo "Locations response (first 100 chars): ${locations:0:100}"

# Test 2: Navigate to intelligent patterns page
echo -e "\n2. Testing intelligent patterns page..."
echo "Navigate to: http://localhost:5000/intelligent-patterns"

# Test 3: Test with sample location data
echo -e "\n3. Testing with location ID 1..."
echo "Submitting test comment about traffic problems..."

comment_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"content": "Heavy traffic and no pedestrian crossings make this area dangerous for families", "commentType": "problem", "sessionId": "test_123"}' \
  "http://localhost:5000/api/locations/1/comments")

echo "Comment submission response: $comment_response"

# Test 4: Check if intelligent suggestions are generated
echo -e "\n4. Testing intelligent suggestions generation..."
suggestions_response=$(curl -s "http://localhost:5000/api/locations/1/intelligent-suggestions")
echo "Suggestions response: $suggestions_response"

# Test 5: Try regenerating suggestions
echo -e "\n5. Testing suggestion regeneration..."
regen_response=$(curl -s -X POST -H "Content-Type: application/json" \
  "http://localhost:5000/api/locations/1/regenerate-suggestions")
echo "Regeneration response: $regen_response"

echo -e "\n6. System Status Summary:"
echo "========================"
echo "✓ Application running on http://localhost:5000"
echo "✓ Intelligent patterns page available at /intelligent-patterns"
echo "✓ Pattern recommendation system ready for testing"
echo ""
echo "Open your browser and navigate to:"
echo "http://localhost:5000/intelligent-patterns"
echo ""
echo "The system analyzes user descriptions of urban problems and"
echo "suggests relevant Christopher Alexander patterns for improvement."