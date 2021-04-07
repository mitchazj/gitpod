// Copyright (c) 2021 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License-AGPL.txt in the project root for license information.

// Code generated by protoc-gen-go-grpc. DO NOT EDIT.

package api

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.32.0 or later.
const _ = grpc.SupportPackageIsVersion7

// ControlServiceClient is the client API for ControlService service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type ControlServiceClient interface {
	// ExposePort exposes a port
	ExposePort(ctx context.Context, in *ExposePortRequest, opts ...grpc.CallOption) (*ExposePortResponse, error)
}

type controlServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewControlServiceClient(cc grpc.ClientConnInterface) ControlServiceClient {
	return &controlServiceClient{cc}
}

func (c *controlServiceClient) ExposePort(ctx context.Context, in *ExposePortRequest, opts ...grpc.CallOption) (*ExposePortResponse, error) {
	out := new(ExposePortResponse)
	err := c.cc.Invoke(ctx, "/supervisor.ControlService/ExposePort", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// ControlServiceServer is the server API for ControlService service.
// All implementations must embed UnimplementedControlServiceServer
// for forward compatibility
type ControlServiceServer interface {
	// ExposePort exposes a port
	ExposePort(context.Context, *ExposePortRequest) (*ExposePortResponse, error)
	mustEmbedUnimplementedControlServiceServer()
}

// UnimplementedControlServiceServer must be embedded to have forward compatible implementations.
type UnimplementedControlServiceServer struct {
}

func (UnimplementedControlServiceServer) ExposePort(context.Context, *ExposePortRequest) (*ExposePortResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ExposePort not implemented")
}
func (UnimplementedControlServiceServer) mustEmbedUnimplementedControlServiceServer() {}

// UnsafeControlServiceServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to ControlServiceServer will
// result in compilation errors.
type UnsafeControlServiceServer interface {
	mustEmbedUnimplementedControlServiceServer()
}

func RegisterControlServiceServer(s grpc.ServiceRegistrar, srv ControlServiceServer) {
	s.RegisterService(&ControlService_ServiceDesc, srv)
}

func _ControlService_ExposePort_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(ExposePortRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(ControlServiceServer).ExposePort(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/supervisor.ControlService/ExposePort",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(ControlServiceServer).ExposePort(ctx, req.(*ExposePortRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// ControlService_ServiceDesc is the grpc.ServiceDesc for ControlService service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var ControlService_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "supervisor.ControlService",
	HandlerType: (*ControlServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "ExposePort",
			Handler:    _ControlService_ExposePort_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "control.proto",
}