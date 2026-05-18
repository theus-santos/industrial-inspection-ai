import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class InspectionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'InspectionTable', {
      tableName: 'InspectionTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1-status-createdAt',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI2-equipmentId-createdAt',
      partitionKey: { name: 'equipmentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    const photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const pdfsBucket = new s3.Bucket(this, 'PdfsBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: { minLength: 8, requireUppercase: true, requireDigits: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
    });

    const lambdaEnv = {
      TABLE_NAME: table.tableName,
      PHOTOS_BUCKET: photosBucket.bucketName,
      PDFS_BUCKET: pdfsBucket.bucketName,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
    };

    const backendPath = path.join(__dirname, '../../backend');

    const makeFunction = (id: string, entry: string): lambdaNode.NodejsFunction => {
      const fn = new lambdaNode.NodejsFunction(this, id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(backendPath, entry),
        handler: 'handler',
        environment: lambdaEnv,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        bundling: { minify: true, sourceMap: false },
      });
      table.grantReadWriteData(fn);
      photosBucket.grantReadWrite(fn);
      pdfsBucket.grantReadWrite(fn);
      return fn;
    };

    const equipmentFn = makeFunction('EquipmentFn', 'src/handlers/equipment.handler.ts');
    const inspectionFn = makeFunction('InspectionFn', 'src/handlers/inspection.handler.ts');
    const photoFn = makeFunction('PhotoFn', 'src/handlers/photo.handler.ts');
    const analyzeFn = makeFunction('AnalyzeFn', 'src/handlers/analyze.handler.ts');
    const reportFn = makeFunction('ReportFn', 'src/handlers/report.handler.ts');

    const api = new apigwv2.HttpApi(this, 'InspectionApi', {
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    const authorizer = new authorizers.HttpUserPoolAuthorizer('CognitoAuth', userPool, {
      userPoolClients: [userPoolClient],
    });

    const authOptions = { authorizer };

    api.addRoutes({ path: '/equipments', methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('EquipInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/equipments/{id}', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('EquipByIdInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/equipments/{id}/history', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('EquipHistInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/inspections', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('InsInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('InsByIdInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}/checklist', methods: [apigwv2.HttpMethod.PUT], integration: new integrations.HttpLambdaIntegration('ChecklistInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}/report', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('ReportInt', reportFn), ...authOptions });
    api.addRoutes({ path: '/photos/presigned-url', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('PhotoInt', photoFn), ...authOptions });
    api.addRoutes({ path: '/photos/{id}/analyze', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('AnalyzeInt', analyzeFn), ...authOptions });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'PhotosBucketName', { value: photosBucket.bucketName });
    new cdk.CfnOutput(this, 'PdfsBucketName', { value: pdfsBucket.bucketName });
  }
}
