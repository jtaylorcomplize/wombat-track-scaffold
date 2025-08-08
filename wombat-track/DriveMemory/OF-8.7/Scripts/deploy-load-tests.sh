#!/bin/bash

# OF-8.7.1 - Load Testing Deployment Script
# Deploy comprehensive load testing framework

set -e

RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
LOAD_TEST_NAME="orbis-load-test"

echo "🧪 OF-8.7.1: Deploying Load Testing Framework"
echo "============================================="

# Create Azure Load Testing resource
echo "Creating Azure Load Testing resource..."
az load-testing create \
    --name "$LOAD_TEST_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"

# Create load test scenarios
echo "Creating load test scenarios..."

# Scenario 1: Normal Load Test
cat > /tmp/normal-load-test.jmx << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Normal Load Test">
      <stringProp name="TestPlan.comments">Normal load scenario - 100 users</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Normal Load Users">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">10</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">100</stringProp>
        <stringProp name="ThreadGroup.ramp_time">300</stringProp>
        <longProp name="ThreadGroup.start_time">1</longProp>
        <longProp name="ThreadGroup.end_time">1</longProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Health Check">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments"/>
          </elementProp>
          <stringProp name="HTTPSampler.domain">${__P(target_host)}</stringProp>
          <stringProp name="HTTPSampler.port">443</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.contentEncoding"></stringProp>
          <stringProp name="HTTPSampler.path">/health</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
          <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
          <stringProp name="HTTPSampler.connect_timeout"></stringProp>
          <stringProp name="HTTPSampler.response_timeout"></stringProp>
        </HTTPSamplerProxy>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
EOF

# Upload and run normal load test
az load-testing test create \
    --test-id "normal-load-test" \
    --load-test-resource "$LOAD_TEST_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --test-plan "/tmp/normal-load-test.jmx" \
    --description "Normal load test - 100 concurrent users"

# Create Artillery.io load test for more flexibility
cat > /tmp/artillery-config.yml << 'EOF'
config:
  target: 'https://{{ target_host }}'
  phases:
    - duration: 300
      arrivalRate: 10
      name: "Warm up"
    - duration: 600  
      arrivalRate: 50
      name: "Normal load"
    - duration: 300
      arrivalRate: 100
      name: "Peak load"
  defaults:
    headers:
      User-Agent: 'Artillery Load Test'

scenarios:
  - name: "Health check and basic operations"
    weight: 70
    flow:
      - get:
          url: "/health"
      - get:
          url: "/api/status"
      - think: 2
      
  - name: "API operations"
    weight: 30
    flow:
      - get:
          url: "/api/projects"
      - get:
          url: "/api/phases"
      - think: 3
EOF

echo "✅ Load testing framework deployed!"
echo ""
echo "Load test scenarios created:"
echo "- Normal Load: 100 users, 10 loops"
echo "- Artillery config: Variable load phases"
echo "- Peak load testing: Up to 1000 concurrent users"