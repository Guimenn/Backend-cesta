import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log do erro
  console.error('❌ Erro capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Tratamento de erros específicos do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Registro já existe com esses dados únicos';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Registro não encontrado';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Violação de chave estrangeira';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Operação inválida no banco de dados';
        break;
      default:
        statusCode = 400;
        message = 'Erro no banco de dados';
    }
  }

  // Tratamento de erros de validação
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dados de entrada inválidos';
  }

  // Tratamento de erros de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Tratamento de erros de sintaxe JSON
  if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'JSON inválido';
  }

  // Resposta de erro
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
};

// Função para criar erros operacionais
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Função para capturar erros assíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
